"use client";

import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LIMITS } from "@/lib/domain.mjs";
import type { Member, Trip } from "@/lib/types";

type StatusChange = { action: "remove-participant" | "restore-participant"; member: Member };
type Save = (action: string, input: unknown) => Promise<Trip | undefined>;
const operationIds = (members: Member[]) => Object.fromEntries(members.map(member => [member.id, crypto.randomUUID()]));

function historyText(entry: Trip["history"][number]) {
  if (entry.action === "rename-member") return `旅伴：${entry.before} → ${entry.after}`;
  if (entry.action === "add-participant") return `新增旅伴：${entry.after.name}`;
  if (entry.action === "remove-participant") return `移除旅伴：${entry.before.name}`;
  if (entry.action === "restore-participant") return `恢復旅伴：${entry.after.name}`;
  if (entry.action === "rename-trip") return `旅程：${entry.before} → ${entry.after}`;
  return entry.after ? "封存旅程" : "解除封存";
}

export function TripSettings({ trip, busy, submit, onDirtyChange }: { trip: Trip; busy: boolean; submit: Save; onDirtyChange: (dirty: boolean) => void }) {
  const [name, setName] = useState(trip.name);
  const [nameTouched, setNameTouched] = useState(false);
  const [revision, setRevision] = useState(trip.revision);
  const [renameId, setRenameId] = useState(() => crypto.randomUUID());
  const [archiveId, setArchiveId] = useState(() => crypto.randomUUID());
  const [memberNames, setMemberNames] = useState<Record<string, string>>(() => Object.fromEntries(trip.members.map(member => [member.id, member.name])));
  const [memberTouched, setMemberTouched] = useState<Record<string, boolean>>({});
  const [memberRenameIds, setMemberRenameIds] = useState<Record<string, string>>(() => operationIds(trip.members));
  const [statusIds, setStatusIds] = useState<Record<string, string>>(() => operationIds(trip.members));
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [addOperationId, setAddOperationId] = useState(() => crypto.randomUUID());
  const [pendingStatus, setPendingStatus] = useState<StatusChange | null>(null);

  const activeMembers = trip.members.filter(member => member.active);
  const removedMembers = trip.members.filter(member => !member.active);
  const stale = revision !== trip.revision;
  const canAdmin = !busy && !stale && trip.me.role === "admin";
  const editable = canAdmin && !trip.archived;
  const canAdd = activeMembers.length < LIMITS.members && trip.members.length < LIMITS.memberRecords;
  const dirty = (nameTouched && name.trim() !== trip.name)
    || newName.length > 0
    || Object.entries(memberTouched).some(([id, touched]) => touched && memberNames[id]?.trim() !== trip.members.find(member => member.id === id)?.name);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const acknowledge = () => {
    if (!nameTouched) setName(trip.name);
    setMemberNames(old => Object.fromEntries(trip.members.map(member => [member.id, memberTouched[member.id] ? old[member.id] ?? member.name : member.name])));
    setRevision(trip.revision);
    setRenameId(crypto.randomUUID());
    setArchiveId(crypto.randomUUID());
    setMemberRenameIds(operationIds(trip.members));
    setStatusIds(operationIds(trip.members));
    setAddOperationId(crypto.randomUUID());
  };

  const renameTrip = async () => {
    const saved = await submit("rename-trip", { id: trip.id, operationId: renameId, revision, name });
    if (!saved) return;
    setRevision(saved.revision);
    setName(saved.name);
    setNameTouched(false);
    setRenameId(crypto.randomUUID());
  };

  const renameMember = async (member: Member) => {
    const saved = await submit("rename-member", { id: member.id, operationId: memberRenameIds[member.id], revision, name: memberNames[member.id] });
    if (!saved) return;
    setRevision(saved.revision);
    setMemberNames(old => ({ ...old, [member.id]: saved.members.find(item => item.id === member.id)?.name ?? member.name }));
    setMemberTouched(old => ({ ...old, [member.id]: false }));
    setMemberRenameIds(old => ({ ...old, [member.id]: crypto.randomUUID() }));
  };

  const addMember = async () => {
    const saved = await submit("add-participant", { id: newId, operationId: addOperationId, revision, name: newName });
    if (!saved) return;
    setRevision(saved.revision);
    setNewName("");
    setNewId(crypto.randomUUID());
    setAddOperationId(crypto.randomUUID());
    setMemberNames(old => ({ ...old, [newId]: saved.members.find(member => member.id === newId)?.name ?? newName.trim() }));
    setMemberRenameIds(old => ({ ...old, [newId]: crypto.randomUUID() }));
    setStatusIds(old => ({ ...old, [newId]: crypto.randomUUID() }));
  };

  const changeMemberStatus = async () => {
    if (!pendingStatus) return;
    const { action, member } = pendingStatus;
    const saved = await submit(action, { id: member.id, operationId: statusIds[member.id], revision });
    if (!saved) { setPendingStatus(null); return; }
    setRevision(saved.revision);
    setStatusIds(old => ({ ...old, [member.id]: crypto.randomUUID() }));
    setPendingStatus(null);
  };

  const changeArchive = async () => {
    const saved = await submit("set-archived", { id: trip.id, operationId: archiveId, revision, archived: !trip.archived });
    if (!saved) return;
    setRevision(saved.revision);
    setArchiveId(crypto.randomUUID());
  };

  const renderMember = (member: Member) => <div className="member-settings-row" key={member.id}>
    <form className="member-settings-edit" onSubmit={event => { event.preventDefault(); void renameMember(member); }}>
      <label className="field">{member.name}
        <input aria-label={`修改 ${member.name} 的名稱`} value={memberNames[member.id] ?? member.name} onChange={event => {
          const value = event.target.value;
          setMemberNames(old => ({ ...old, [member.id]: value }));
          setMemberTouched(old => ({ ...old, [member.id]: value.trim() !== member.name }));
        }} required maxLength={40} disabled={trip.archived} />
      </label>
      <button className="secondary" aria-label={`儲存 ${member.name} 的新名稱`} disabled={!editable || memberNames[member.id]?.trim() === member.name}>儲存名稱</button>
    </form>
    <button type="button" className={member.active ? "secondary danger-text" : "secondary"} aria-label={`${member.active ? "移除" : "恢復"}旅伴 ${member.name}`} disabled={!editable || (member.active ? activeMembers.length <= 1 : activeMembers.length >= LIMITS.members)} onClick={() => setPendingStatus({ action: member.active ? "remove-participant" : "restore-participant", member })}>
      {member.active ? "移除旅伴" : "恢復旅伴"}
    </button>
    {member.active && activeMembers.length <= 1 && <p className="small muted member-settings-hint">旅程須保留至少 1 位使用中的旅伴。</p>}
    {!member.active && activeMembers.length >= LIMITS.members && <p className="small muted member-settings-hint">使用中旅伴已達 {LIMITS.members} 位，先移除一位才能恢復。</p>}
  </div>;

  const changeHistory = trip.history.filter(entry => ["rename-trip", "rename-member", "add-participant", "remove-participant", "restore-participant", "set-archived"].includes(entry.action));

  return <div className="form-stack">
    {stale && <div className="notice" role="alert"><p>旅程已有更新。目前名稱：{trip.name}；使用中旅伴：{activeMembers.map(member => member.name).join("、")}。你修改過的輸入仍保留，請核對後再送出。</p><button type="button" className="secondary" onClick={acknowledge}>已核對，使用最新版本</button></div>}
    <form className="form-stack" onSubmit={event => { event.preventDefault(); void renameTrip(); }}>
      <label className="field">旅程名稱<input value={name} onChange={event => { const value = event.target.value; setName(value); setNameTouched(value.trim() !== trip.name); }} required maxLength={60} disabled={trip.archived} /></label>
      <button className="primary" disabled={!editable || name.trim() === trip.name}>儲存旅程名稱</button>
    </form>

    <section className="member-settings">
      <h3>記帳旅伴</h3>
      <p className="small muted">這裡管理帳務中的旅伴。改名會更新舊帳目顯示名稱，不改變金額；登入帳號的存取權限請到「共同記帳」管理。</p>
      <form className="member-settings-add" onSubmit={event => { event.preventDefault(); void addMember(); }}>
        <label className="field">新增旅伴<input value={newName} onChange={event => setNewName(event.target.value)} placeholder="輸入新旅伴名稱" required maxLength={40} disabled={trip.archived || !canAdd} /></label>
        <button className="primary" disabled={!editable || !newName.trim() || !canAdd}>新增旅伴</button>
      </form>
      {!canAdd && <p className="small muted">每個旅程最多 {LIMITS.members} 位使用中旅伴、{LIMITS.memberRecords} 位歷史旅伴。</p>}
      <h4 className="member-settings-group-title">使用中 · {activeMembers.length} 位</h4>
      {activeMembers.map(renderMember)}
      {!!removedMembers.length && <><h4 className="member-settings-group-title">已移除 · {removedMembers.length} 位</h4><p className="small muted member-settings-hint">這些旅伴不再納入新支出，舊帳與結清仍保留；恢復後沿用原本身分。</p>{removedMembers.map(renderMember)}</>}
    </section>

    <div className="archive-section"><h3>{trip.archived ? "繼續這段旅程" : "整理已結束的旅程"}</h3><p className="small muted">封存會保留所有帳目、餘額與收據，仍可查看及備份。解除封存後才能再修改。</p><button className="secondary" disabled={!canAdmin} onClick={() => void changeArchive()}>{trip.archived ? "解除封存" : "封存旅程"}</button></div>
    {!!changeHistory.length && <details className="change-history"><summary>旅程與旅伴異動歷史</summary><ol>{[...changeHistory].reverse().map(entry => <li key={entry.id}><time dateTime={entry.at}>{new Date(entry.at).toLocaleString("zh-TW")}</time><p>{historyText(entry)}</p></li>)}</ol></details>}

    <AlertDialog open={!!pendingStatus} onOpenChange={open => { if (!open && !busy) setPendingStatus(null); }}><AlertDialogContent className="ledger-dialog"><AlertDialogTitle>{pendingStatus?.action === "restore-participant" ? `恢復「${pendingStatus.member.name}」？` : pendingStatus ? `移除「${pendingStatus.member.name}」？` : "旅伴設定"}</AlertDialogTitle><AlertDialogDescription>{pendingStatus?.action === "restore-participant" ? "恢復後，這位旅伴會重新出現在新支出的付款與分攤選項；原有帳目與身分保持不變。" : pendingStatus ? "移除後，這位旅伴不再納入新支出；既有支出、還款與待結清餘額都會保留，仍可繼續結清。之後可以恢復同一位旅伴。登入帳號的權限另在「共同記帳」管理。" : ""}</AlertDialogDescription>{stale && <p className="notice" role="alert">旅程已有更新，請返回管理畫面核對後再操作。</p>}<AlertDialogFooter><AlertDialogCancel>返回管理</AlertDialogCancel><AlertDialogAction variant={pendingStatus?.action === "remove-participant" ? "destructive" : "default"} disabled={!editable || (pendingStatus?.action === "restore-participant" && activeMembers.length >= LIMITS.members)} onClick={event => { event.preventDefault(); void changeMemberStatus(); }}>{pendingStatus?.action === "restore-participant" ? "確認恢復" : "確認移除"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
