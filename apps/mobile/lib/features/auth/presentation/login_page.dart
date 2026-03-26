import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../data/auth_repository.dart';
import '../../../core/config/theme.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage>
    with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  String? _loadingProvider;

  // Demo 登入觸發計數器
  int _versionTapCount = 0;
  DateTime? _lastTapTime;
  String _appVersion = '';

  @override
  void initState() {
    super.initState();
    _loadAppVersion();
  }

  Future<void> _loadAppVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() {
        _appVersion = 'v${packageInfo.version}';
      });
    }
  }

  Future<void> _loginWithLine() async {
    setState(() {
      _isLoading = true;
      _loadingProvider = 'line';
    });
    try {
      final authRepo = ref.read(authRepositoryProvider);
      final success = await authRepo.loginWithLine();
      if (success && mounted) {
        context.go('/trips');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('登入失敗: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingProvider = null;
        });
      }
    }
  }

  Future<void> _loginWithGoogle() async {
    setState(() {
      _isLoading = true;
      _loadingProvider = 'google';
    });
    try {
      final authRepo = ref.read(authRepositoryProvider);
      final success = await authRepo.loginWithGoogle();
      if (success && mounted) {
        context.go('/trips');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('登入失敗: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingProvider = null;
        });
      }
    }
  }

  Future<void> _loginWithApple() async {
    setState(() {
      _isLoading = true;
      _loadingProvider = 'apple';
    });
    try {
      final authRepo = ref.read(authRepositoryProvider);
      final success = await authRepo.loginWithApple();
      if (success && mounted) {
        context.go('/trips');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('登入失敗: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingProvider = null;
        });
      }
    }
  }

  /// 處理版本號點擊，連續點擊 5 次觸發 Demo 登入對話框
  void _handleVersionTap() {
    final now = DateTime.now();

    // 如果距離上次點擊超過 2 秒，重置計數
    if (_lastTapTime != null &&
        now.difference(_lastTapTime!).inMilliseconds > 2000) {
      _versionTapCount = 0;
    }

    _lastTapTime = now;
    _versionTapCount++;

    if (_versionTapCount >= 5) {
      _versionTapCount = 0;
      _showDemoLoginDialog();
    }
  }

  /// 顯示 Demo 登入對話框
  void _showDemoLoginDialog() {
    final usernameController = TextEditingController();
    final passwordController = TextEditingController();
    bool isLoading = false;
    bool obscurePassword = true;
    bool isDisposed = false;

    // 確保控制器被釋放的輔助函數
    void disposeControllers() {
      if (!isDisposed) {
        isDisposed = true;
        usernameController.dispose();
        passwordController.dispose();
      }
    }

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return PopScope(
              onPopInvokedWithResult: (didPop, result) {
                // 無論 didPop 為何，都嘗試釋放控制器
                disposeControllers();
              },
              child: AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.admin_panel_settings_rounded,
                      color: Color(0xFF6366F1),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Demo 登入',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF374151),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '請輸入測試帳號密碼',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: usernameController,
                    decoration: InputDecoration(
                      labelText: '帳號',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Color(0xFF6366F1),
                          width: 2,
                        ),
                      ),
                    ),
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: obscurePassword,
                    decoration: InputDecoration(
                      labelText: '密碼',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscurePassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () {
                          setDialogState(() {
                            obscurePassword = !obscurePassword;
                          });
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Color(0xFF6366F1),
                          width: 2,
                        ),
                      ),
                    ),
                    enabled: !isLoading,
                    onSubmitted: (_) async {
                      if (usernameController.text.isNotEmpty &&
                          passwordController.text.isNotEmpty) {
                        await _performDemoLogin(
                          dialogContext,
                          usernameController.text,
                          passwordController.text,
                          setDialogState,
                          (value) => isLoading = value,
                        );
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isLoading
                      ? null
                      : () => Navigator.of(dialogContext).pop(),
                  child: Text(
                    '取消',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
                ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : () async {
                          if (usernameController.text.isEmpty ||
                              passwordController.text.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('請輸入帳號和密碼'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }
                          await _performDemoLogin(
                            dialogContext,
                            usernameController.text,
                            passwordController.text,
                            setDialogState,
                            (value) => isLoading = value,
                          );
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('登入'),
                ),
              ],
            ),
            );
          },
        );
      },
    );
  }

  /// 執行 Demo 登入
  Future<void> _performDemoLogin(
    BuildContext dialogContext,
    String username,
    String password,
    StateSetter setDialogState,
    Function(bool) setLoading,
  ) async {
    setDialogState(() => setLoading(true));

    try {
      final authRepo = ref.read(authRepositoryProvider);
      final success = await authRepo.loginWithDemo(username, password);

      if (success && mounted) {
        Navigator.of(dialogContext).pop();
        context.go('/trips');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$e'),
            backgroundColor: AppTheme.categoryColors['FOOD'],
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      setDialogState(() => setLoading(false));
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.categoryColors['FOOD'],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF6366F1),
              Color(0xFF8B5CF6),
              Color(0xFFA855F7),
            ],
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // 背景裝飾圓形
              ..._buildBackgroundDecorations(),

              // 主要內容
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    const Spacer(flex: 2),

                    // Logo 和標題區域
                    _buildLogoSection(),

                    const Spacer(flex: 2),

                    // 登入按鈕區域
                    _buildLoginButtons(),

                    const SizedBox(height: 32),

                    // 底部提示文字
                    _buildFooter(),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildBackgroundDecorations() {
    return [
      Positioned(
        top: -100,
        right: -100,
        child: Container(
          width: 300,
          height: 300,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.1),
          ),
        ),
      )
          .animate()
          .fadeIn(duration: 1000.ms)
          .scale(begin: const Offset(0.8, 0.8), duration: 1000.ms),
      Positioned(
        bottom: -150,
        left: -100,
        child: Container(
          width: 400,
          height: 400,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
      )
          .animate(delay: 200.ms)
          .fadeIn(duration: 1000.ms)
          .scale(begin: const Offset(0.8, 0.8), duration: 1000.ms),
      Positioned(
        top: 200,
        left: -50,
        child: Container(
          width: 150,
          height: 150,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.05),
          ),
        ),
      )
          .animate(delay: 400.ms)
          .fadeIn(duration: 1000.ms)
          .scale(begin: const Offset(0.8, 0.8), duration: 1000.ms),
    ];
  }

  Widget _buildLogoSection() {
    return Column(
      children: [
        // Logo 圖示
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(32),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 30,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          child: const Icon(
            Icons.account_balance_wallet_rounded,
            size: 64,
            color: Color(0xFF6366F1),
          ),
        )
            .animate()
            .fadeIn(duration: 600.ms)
            .slideY(begin: -0.3, end: 0, duration: 600.ms, curve: Curves.easeOut)
            .then()
            .animate(onPlay: (controller) => controller.repeat(reverse: true))
            .moveY(begin: 0, end: -8, duration: 2000.ms, curve: Curves.easeInOut),

        const SizedBox(height: 32),

        // 標題
        const Text(
          'TripLedger',
          style: TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            letterSpacing: -1,
          ),
        )
            .animate(delay: 300.ms)
            .fadeIn(duration: 600.ms)
            .slideY(begin: 0.3, end: 0, duration: 600.ms),

        const SizedBox(height: 12),

        // 副標題
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text(
            '團體旅遊分帳好幫手',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        )
            .animate(delay: 500.ms)
            .fadeIn(duration: 600.ms)
            .slideY(begin: 0.3, end: 0, duration: 600.ms),
      ],
    );
  }

  Widget _buildLoginButtons() {
    return Column(
      children: [
        // Apple 登入按鈕（僅 iOS，放在最上方符合 Apple 設計規範）
        if (Platform.isIOS) ...[
          _buildAppleSignInButton()
              .animate(delay: 550.ms)
              .fadeIn(duration: 500.ms)
              .slideX(begin: -0.2, end: 0, duration: 500.ms),
          const SizedBox(height: 16),
        ],

        // LINE 登入按鈕
        _SocialLoginButton(
          onPressed: _isLoading ? null : _loginWithLine,
          icon: Icons.chat_bubble_rounded,
          label: '使用 LINE 登入',
          gradient: const LinearGradient(
            colors: [Color(0xFF00B900), Color(0xFF00D400)],
          ),
          isLoading: _loadingProvider == 'line',
        )
            .animate(delay: 600.ms)
            .fadeIn(duration: 500.ms)
            .slideX(begin: -0.2, end: 0, duration: 500.ms),

        const SizedBox(height: 16),

        // Google 登入按鈕
        _SocialLoginButton(
          onPressed: _isLoading ? null : _loginWithGoogle,
          icon: Icons.g_mobiledata_rounded,
          label: '使用 Google 登入',
          isOutlined: true,
          isLoading: _loadingProvider == 'google',
        )
            .animate(delay: 700.ms)
            .fadeIn(duration: 500.ms)
            .slideX(begin: 0.2, end: 0, duration: 500.ms),
      ],
    );
  }

  /// Apple 登入按鈕（使用官方樣式）
  Widget _buildAppleSignInButton() {
    return SizedBox(
      height: 56,
      width: double.infinity,
      child: _loadingProvider == 'apple'
          ? Container(
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ),
            )
          : ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SignInWithAppleButton(
                onPressed: _isLoading ? () {} : _loginWithApple,
                text: '使用 Apple 登入',
                style: SignInWithAppleButtonStyle.black,
              ),
            ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.shield_outlined,
              size: 16,
              color: Colors.white.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 8),
            Text(
              '安全登入，保護您的資料隱私',
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
          ],
        ).animate(delay: 900.ms).fadeIn(duration: 500.ms),
        const SizedBox(height: 16),
        // 版本號（連續點擊 5 次觸發 Demo 登入）
        GestureDetector(
          onTap: _handleVersionTap,
          child: Text(
            _appVersion.isNotEmpty ? _appVersion : 'v1.0.0',
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.5),
            ),
          ),
        ).animate(delay: 1000.ms).fadeIn(duration: 500.ms),
      ],
    );
  }
}

class _SocialLoginButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;
  final LinearGradient? gradient;
  final bool isOutlined;
  final bool isLoading;

  const _SocialLoginButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    this.gradient,
    this.isOutlined = false,
    this.isLoading = false,
  });

  @override
  State<_SocialLoginButton> createState() => _SocialLoginButtonState();
}

class _SocialLoginButtonState extends State<_SocialLoginButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        );
      },
      child: GestureDetector(
        onTapDown: (_) {
          if (widget.onPressed != null && !widget.isLoading) {
            setState(() => _isPressed = true);
            _controller.forward();
          }
        },
        onTapUp: (_) {
          if (_isPressed) {
            setState(() => _isPressed = false);
            _controller.reverse();
            widget.onPressed?.call();
          }
        },
        onTapCancel: () {
          if (_isPressed) {
            setState(() => _isPressed = false);
            _controller.reverse();
          }
        },
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            gradient: widget.isOutlined ? null : widget.gradient,
            color: widget.isOutlined ? Colors.white : null,
            borderRadius: BorderRadius.circular(16),
            border: widget.isOutlined
                ? Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2)
                : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // 內容
              AnimatedOpacity(
                opacity: widget.isLoading ? 0 : 1,
                duration: const Duration(milliseconds: 200),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      widget.icon,
                      size: 28,
                      color: widget.isOutlined
                          ? const Color(0xFF6366F1)
                          : Colors.white,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      widget.label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: widget.isOutlined
                            ? const Color(0xFF374151)
                            : Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
              // Loading 指示器
              if (widget.isLoading)
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      widget.isOutlined
                          ? const Color(0xFF6366F1)
                          : Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
