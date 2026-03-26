import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../storage/auth_storage.dart';
import 'api_exception.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final authStorage = ref.read(authStorageProvider);
  return ApiClient(authStorage: authStorage);
});

class ApiClient {
  final AuthStorage authStorage;
  late final Dio _dio;

  ApiClient({required this.authStorage}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await authStorage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Token 過期，嘗試刷新
            final refreshed = await _refreshToken();
            if (refreshed) {
              // 重新發送請求
              final token = await authStorage.getAccessToken();
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              try {
                final response = await _dio.fetch(error.requestOptions);
                return handler.resolve(response);
              } on DioException catch (e) {
                return handler.reject(e);
              }
            }
          }
          // 將 DioException 轉換為 ApiException
          final apiException = ApiException.fromDioException(error);
          return handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: error.type,
              error: apiException,
              message: apiException.message,
            ),
          );
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await authStorage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '${ApiConfig.auth}/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        await authStorage.saveTokens(
          accessToken: response.data['accessToken'],
          refreshToken: response.data['refreshToken'],
        );
        return true;
      }
    } catch (e) {
      await authStorage.clearTokens();
    }
    return false;
  }

  // GET 請求
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.get(path, queryParameters: queryParameters);
  }

  // POST 請求
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.post(path, data: data, queryParameters: queryParameters);
  }

  // PUT 請求
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.put(path, data: data, queryParameters: queryParameters);
  }

  // DELETE 請求
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.delete(path, data: data, queryParameters: queryParameters);
  }

  // POST Multipart 請求 (用於檔案上傳)
  Future<Response> postMultipart(
    String path, {
    required Map<String, dynamic> data,
    File? file,
    String fileField = 'receiptImage',
    Map<String, dynamic>? queryParameters,
  }) async {
    final formData = await _createFormData(data, file, fileField);
    return _dio.post(
      path,
      data: formData,
      queryParameters: queryParameters,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  // PUT Multipart 請求 (用於檔案上傳更新)
  Future<Response> putMultipart(
    String path, {
    required Map<String, dynamic> data,
    File? file,
    String fileField = 'receiptImage',
    Map<String, dynamic>? queryParameters,
  }) async {
    final formData = await _createFormData(data, file, fileField);
    return _dio.put(
      path,
      data: formData,
      queryParameters: queryParameters,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  // 建立 FormData
  Future<FormData> _createFormData(
    Map<String, dynamic> data,
    File? file,
    String fileField,
  ) async {
    final Map<String, dynamic> formMap = {};

    // 處理資料欄位
    for (final entry in data.entries) {
      if (entry.value != null) {
        if (entry.value is List) {
          // 陣列需要轉為 JSON 字串
          formMap[entry.key] = entry.value;
        } else if (entry.value is Map) {
          // Map 需要轉為 JSON 字串
          formMap[entry.key] = entry.value;
        } else {
          formMap[entry.key] = entry.value.toString();
        }
      }
    }

    // 處理檔案
    if (file != null) {
      final fileName = file.path.split('/').last;
      formMap[fileField] = await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      );
    }

    return FormData.fromMap(formMap);
  }
}
