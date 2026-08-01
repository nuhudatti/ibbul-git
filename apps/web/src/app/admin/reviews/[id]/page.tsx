"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ExternalLink, FileCode2, FileImage, Folder, FolderOpen, GitBranch, MessageSquare, Play, Plus, Send, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type FileEntry = { path: string; content?: string; language?: string };
type Review = {
  id: string; title: string; summary: string | null; status: string; studentMatric: string; assignmentId: string; projectSnapshotId: string | null; submittedAt: string | null; updatedAt: string; reviewerName: string | null;
  comments: Array<{ id: string; message: string; filePath: string | null; priority: string; status: string; feedbackType: string; createdAt: string; authorRole: string }>;
  checklist: Array<{ id: string; title: string; checked: boolean; notes: string | null }>;
  revisions: Array<{ id: string; revisionNumber: number; status: string; submittedAt: string | null; createdAt: string; summary: string | null; deploymentUrl: string | null; files: Array<{ fileName: string; fileUrl: string | null }> }>;
  student: { firstName: string; lastName: string; email: string } | null;
};

type Tab = "preview" | "source" | "deployment" | "history";
const languages = new Set(["html", "css", "javascript", "typescript", "json", "js", "jsx", "tsx"]);
const ratingNames = ["Code quality", "UI/UX", "Responsiveness", "Accessibility", "Performance", "Best practices"];
const statusLabel: Record<string, string> = { DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", CHANGES_REQUESTED: "Changes requested", RESUBMITTED: "Resubmitted", APPROVED: "Approved", REJECTED: "Rejected", PUBLISHED: "Published" };

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not submitted"; }
function fileIcon(path: string) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(path) ? <FileImage size={15} /> : <FileCode2 size={15} />; }

function FileTree({ files, selected, onSelect }: { files: FileEntry[]; selected: string; onSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const visible = files.filter((file) => file.path.toLowerCase().includes(search.toLowerCase()));
  const nodes = useMemo(() => {
    const roots: Array<{ name: string; path: string; children: Map<string, unknown>; file?: FileEntry }> = [];
    visible.forEach((file) => {
      const parts = file.path.split("/");
      let current = roots;
      let parent: (typeof roots)[number] | undefined;
      let prefix = "";
      parts.forEach((part, index) => {
        prefix = prefix ? `${prefix}/${part}` : part;
        let node = current.find((item) => item.name === part);
        if (!node) {
          node = { name: part, path: prefix, children: new Map() };
          current.push(node);
          parent?.children.set(part, node);
        }
        if (index === parts.length - 1) node.file = file;
        else {
          parent = node;
          current = [...node.children.values()] as typeof roots;
        }
      });
    });
    return roots;
  }, [visible]);
  const render = (items: typeof nodes, depth = 0): React.ReactNode => items.map((node) => {
    const isFolder = !node.file;
    const open = expanded[node.path] ?? depth === 0;
    return <div key={node.path}>
      <button type="button" onClick={() => isFolder ? setExpanded((value) => ({ ...value, [node.path]: !open })) : onSelect(node.path)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs", selected === node.path ? "bg-cyan-400/10 text-cyan-200" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200")} style={{ paddingLeft: `${8 + depth * 14}px` }}>
        {isFolder ? (open ? <FolderOpen size={14} className="text-amber-300" /> : <Folder size={14} className="text-amber-300" />) : fileIcon(node.path)}<span className="truncate">{node.name}</span>{isFolder ? <span className="ml-auto">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span> : null}
      </button>
      {isFolder && open ? render([...node.children.values()] as typeof nodes, depth + 1) : null}
    </div>;
  });
  return <div className="flex h-full min-h-0 flex-col"><div className="border-b border-white/8 p-3"><Input aria-label="Search files" placeholder="Filter files" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 rounded-lg text-xs" /></div><div className="ula-scrollbar min-h-0 flex-1 overflow-auto p-2">{render(nodes)}</div></div>;
}

export default function AdminReviewWorkspace() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [review, setReview] = useState<Review | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [tab, setTab] = useState<Tab>("preview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: "Changes requested", summary: "", priority: "HIGH", deadline: "" });
  const [newChecklist, setNewChecklist] = useState("");

  const load = async () => {
    const response = await adminFetch(`/api/reviews/${params.id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load review");
    setReview(data.review);
    if (data.review.projectSnapshotId) {
      const snapshotResponse = await adminFetch(`/api/project-snapshots?matricNumber=${encodeURIComponent(data.review.studentMatric)}&assignmentId=${encodeURIComponent(data.review.assignmentId)}`);
      if (snapshotResponse.ok) {
        const snapshot = await snapshotResponse.json();
        const snapshotFiles = Array.isArray(snapshot.snapshot?.files) ? snapshot.snapshot.files : [];
        setFiles(snapshotFiles);
        if (!selectedFile && snapshotFiles[0]?.path) setSelectedFile(snapshotFiles[0].path);
      }
    }
  };

  useEffect(() => {
    if (!user || user.role !== "ADMIN") { router.replace("/"); return; }
    void load().catch((error: Error) => setNotice(error.message)).finally(() => setLoading(false));
    // Review id is the only external input for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router, user]);

  const selected = files.find((file) => file.path === selectedFile);
  const deploymentUrl = review?.revisions.find((revision) => revision.deploymentUrl)?.deploymentUrl ?? null;
  const currentRevision = review?.revisions[0]?.revisionNumber ?? 1;
  const canEdit = review ? !["APPROVED", "PUBLISHED", "REJECTED"].includes(review.status) : false;

  const action = async (name: string, body: Record<string, unknown> = {}) => {
    setBusy(true); setNotice(null);
    try {
      const response = await adminFetch(`/api/reviews/${params.id}`, { method: "POST", body: JSON.stringify({ action: name, ...body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      await load();
      setNotice(name === "request-changes" ? "Changes requested. The student can now revise this submission." : "Review updated.");
      return data;
    } catch (error) { setNotice((error as Error).message); throw error; } finally { setBusy(false); }
  };

  const submitComment = async () => {
    if (!comment.trim() || !selectedFile) return;
    await action("feedback", { message: comment.trim(), filePath: selectedFile, priority, feedbackType: "FILE" });
    setComment("");
  };
  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestForm.summary.trim()) return;
    await action("feedback", { message: requestForm.summary.trim(), priority: requestForm.priority, feedbackType: "GENERAL" });
    await action("request-changes", { message: requestForm.summary.trim(), note: requestForm.title });
    setRequestOpen(false);
  };
  const addChecklist = async () => {
    if (!newChecklist.trim()) return;
    await action("checklist", { title: newChecklist.trim() });
    setNewChecklist("");
  };

  if (loading) return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading review workspace...</main>;
  if (!review) return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-red-300">{notice ?? "Review not found"}</main>;
  const studentName = review.student ? `${review.student.firstName} ${review.student.lastName}` : review.studentMatric;

  return <main className="ula-mesh-bg min-h-screen text-zinc-100">
    <header className="border-b border-white/10 bg-black/25 px-4 py-4 sm:px-7"><div className="mx-auto max-w-[1680px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => router.push("/admin/reviews")} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><ArrowLeft size={15} /> Review queue</button><div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck size={15} className="text-cyan-300" /> Admin review workspace</div></div>
      <div className="flex flex-wrap items-end justify-between gap-5"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300">{statusLabel[review.status] ?? review.status}</span><span className="text-xs text-zinc-500">Revision {currentRevision}</span></div><h1 className="text-2xl font-semibold text-white">{review.title}</h1><p className="mt-2 text-sm text-zinc-400">{studentName} · {review.studentMatric} · submitted {formatDate(review.submittedAt)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy || !["SUBMITTED", "RESUBMITTED"].includes(review.status)} onClick={() => void action("start-review")}><Play size={14} /> Start review</Button><Button size="sm" variant="secondary" disabled={busy || !canEdit} onClick={() => setRequestOpen(true)}><MessageSquare size={14} /> Request changes</Button><Button size="sm" variant="success" disabled={busy || !canEdit} onClick={() => void action("approve")}><Check size={14} /> Approve</Button><Button size="sm" variant="danger" disabled={busy || !canEdit} onClick={() => void action("reject")}><X size={14} /> Reject</Button><Button size="sm" disabled={busy || review.status !== "APPROVED"} onClick={() => void action("publish")}><ExternalLink size={14} /> Publish</Button></div></div>
      {notice ? <div role="status" className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">{notice}</div> : null}
    </div></header>

    <div className="mx-auto grid max-w-[1680px] gap-px bg-white/10 lg:grid-cols-[230px_minmax(0,1fr)_330px]">
      <aside className="min-h-[420px] bg-[#0b0b11] lg:h-[calc(100vh-190px)]"><div className="border-b border-white/8 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Project files</div><FileTree files={files} selected={selectedFile} onSelect={(path) => { setSelectedFile(path); setTab("source"); }} /></aside>
      <section className="min-w-0 bg-[#101017] lg:h-[calc(100vh-190px)]"><nav className="flex overflow-x-auto border-b border-white/8 px-3" aria-label="Review workspace tabs">{(["preview", "source", "deployment", "history"] as Tab[]).map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-xs capitalize", tab === item ? "border-cyan-300 text-cyan-200" : "border-transparent text-zinc-500 hover:text-zinc-200")}>{item === "history" ? "Revision history" : item === "source" ? "Source code" : item === "preview" ? "Live preview" : "Deployment"}</button>)}</nav>
        {tab === "preview" ? <div className="flex h-[calc(100%-48px)] min-h-[420px] flex-col"><div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div><p className="text-sm font-medium text-white">Live project preview</p><p className="mt-1 text-xs text-zinc-500">Review the deployed artifact without changing it.</p></div>{deploymentUrl ? <a href={deploymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-cyan-300 hover:text-cyan-200">Open live URL <ExternalLink size={13} /></a> : null}</div>{deploymentUrl ? <iframe title="Live project preview" src={deploymentUrl} className="min-h-0 flex-1 border-0 bg-white" /> : <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">No deployment URL is attached to this review.</div>}</div> : null}
        {tab === "source" ? <div className="h-[calc(100%-48px)] min-h-[420px] overflow-auto bg-[#09090d] p-4 font-mono text-xs leading-6"><div className="mb-3 flex items-center gap-2 border-b border-white/8 pb-3 text-zinc-400">{selected ? fileIcon(selected.path) : <FileCode2 size={15} />} {selectedFile || "Select a file"}</div>{selected ? <pre className="grid grid-cols-[40px_minmax(0,1fr)] whitespace-pre-wrap break-words"><code className="select-none pr-4 text-right text-zinc-700">{(selected.content ?? "").split("\n").map((_, index) => `${index + 1}\n`).join("")}</code><code className="text-zinc-300">{selected.content ?? "Binary or empty file"}</code></pre> : null}</div> : null}
        {tab === "deployment" ? <div className="space-y-4 p-5"><div className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Deployment URL</p>{deploymentUrl ? <a className="mt-2 block break-all text-sm text-cyan-300" href={deploymentUrl} target="_blank" rel="noreferrer">{deploymentUrl}</a> : <p className="mt-2 text-sm text-zinc-500">No deployment attached</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-zinc-500">Status</p><p className="mt-1 text-sm text-emerald-300">{deploymentUrl ? "Deployed" : "Not deployed"}</p></div><div><p className="text-xs text-zinc-500">Last activity</p><p className="mt-1 text-sm text-zinc-300">{formatDate(review.updatedAt)}</p></div></div></div></div> : null}
        {tab === "history" ? <div className="ula-scrollbar h-[calc(100%-48px)] min-h-[420px] overflow-auto p-5"><div className="relative ml-3 border-l border-white/10 pl-7">{review.revisions.length === 0 ? <p className="text-sm text-zinc-500">Original submission is attached to this review. No resubmitted revisions yet.</p> : review.revisions.slice().reverse().map((revision) => <div key={revision.id} className="relative mb-8"><span className="absolute -left-[35px] top-1 h-3 w-3 rounded-full border-2 border-cyan-300 bg-[#101017]" /><p className="text-sm font-medium text-white">Revision {revision.revisionNumber}</p><p className="mt-1 text-xs text-cyan-300">{statusLabel[revision.status] ?? revision.status}</p><p className="mt-2 text-xs text-zinc-500">{formatDate(revision.submittedAt ?? revision.createdAt)}</p>{revision.summary ? <p className="mt-2 text-sm text-zinc-400">{revision.summary}</p> : null}</div>)}</div></div> : null}
      </section>

      <aside className="ula-scrollbar min-h-[500px] space-y-5 overflow-auto bg-[#0b0b11] p-4 lg:h-[calc(100vh-190px)]"><section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Review controls</h2><GitBranch size={15} className="text-zinc-600" /></div><div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"><label className="block text-xs text-zinc-500">Review title<input value={review.title} readOnly className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-zinc-200" /></label><label className="block text-xs text-zinc-500">Recommendation<select aria-label="Recommendation" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-zinc-200"><option>Approve</option><option>Needs changes</option><option>Reject</option></select></label><label className="block text-xs text-zinc-500">Priority<select aria-label="Feedback priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-zinc-200"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label></div></section>
        <section><h2 className="mb-3 text-sm font-semibold text-white">Quality rating</h2><div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">{ratingNames.map((name) => <div key={name} className="flex items-center justify-between gap-2"><span className="text-xs text-zinc-400">{name}</span><div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button type="button" aria-label={`${name} ${value} of 5`} key={value} onClick={() => setRatings((current) => ({ ...current, [name]: value }))} className={cn("h-5 w-5 rounded text-[10px]", (ratings[name] ?? 0) >= value ? "bg-cyan-300 text-black" : "bg-white/10 text-zinc-500")}>{value}</button>)}</div></div>)}</div></section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Checklist</h2><span className="text-xs text-zinc-600">{review.checklist.filter((item) => item.checked).length}/{review.checklist.length}</span></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">{review.checklist.map((item) => <div key={item.id} className="flex items-center gap-2 py-2 text-xs text-zinc-300"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", item.checked ? "border-emerald-300 bg-emerald-300 text-black" : "border-white/20")}>{item.checked ? <Check size={11} /> : null}</span>{item.title}</div>)}<div className="mt-2 flex gap-2"><input aria-label="New checklist item" value={newChecklist} onChange={(event) => setNewChecklist(event.target.value)} placeholder="Add item" className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 text-xs outline-none focus:border-cyan-300/50" /><button type="button" onClick={() => void addChecklist()} className="rounded-lg border border-white/10 px-2 text-zinc-400 hover:text-white" aria-label="Add checklist item"><Plus size={14} /></button></div></div></section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">File comments</h2><span className="text-xs text-zinc-600">{review.comments.filter((item) => item.filePath).length}</span></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="mb-2 truncate text-xs text-cyan-300">{selectedFile || "Select a file from explorer"}</p><textarea aria-label="File comment" value={comment} onChange={(event) => setComment(event.target.value)} disabled={!selectedFile || !canEdit} placeholder="Add a precise comment..." className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-zinc-200 outline-none focus:border-cyan-300/50" /><Button size="sm" className="mt-2 w-full" disabled={!comment.trim() || !selectedFile || !canEdit || busy} onClick={() => void submitComment()}><Send size={13} /> Save comment</Button>{review.comments.filter((item) => item.filePath).slice(-3).map((item) => <div key={item.id} className="mt-3 border-t border-white/8 pt-3"><p className="text-xs text-zinc-300">{item.message}</p><p className="mt-1 text-[10px] text-zinc-600">{item.filePath} · {item.priority}</p></div>)}</div></section>
      </aside>
    </div>

    {requestOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation"><form onSubmit={(event) => void submitRequest(event)} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#14141d] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="request-title"><div className="mb-5 flex items-center justify-between"><div><h2 id="request-title" className="text-lg font-semibold text-white">Request changes</h2><p className="mt-1 text-xs text-zinc-500">This unlocks revision mode for {studentName} only.</p></div><button type="button" onClick={() => setRequestOpen(false)} aria-label="Close dialog" className="text-zinc-500 hover:text-white"><X size={18} /></button></div><div className="space-y-4"><Input label="Feedback title" value={requestForm.title} onChange={(event) => setRequestForm((form) => ({ ...form, title: event.target.value }))} /><label className="block text-sm font-medium text-zinc-300">Summary<textarea required value={requestForm.summary} onChange={(event) => setRequestForm((form) => ({ ...form, summary: event.target.value }))} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50" placeholder="Explain what needs to change..." /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-zinc-300">Priority<select value={requestForm.priority} onChange={(event) => setRequestForm((form) => ({ ...form, priority: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label className="text-sm font-medium text-zinc-300">Deadline<input type="date" value={requestForm.deadline} onChange={(event) => setRequestForm((form) => ({ ...form, deadline: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm" /></label></div></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setRequestOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !requestForm.summary.trim()}><MessageSquare size={14} /> Request changes</Button></div></form></div> : null}
  </main>;
}
