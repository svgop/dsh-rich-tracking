window.__ModuleLoader__.load({
	id: "dsh-rich-tracking",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/cx.js
		function cx() {
			let out = "";
			for (const entry of arguments) {
				if (!entry) continue;
				if (typeof entry === "string" || typeof entry === "number") out += (out ? " " : "") + entry;
				else if (Array.isArray(entry)) { const nested = cx(...entry); if (nested) out += (out ? " " : "") + nested; }
				else for (const [key, value] of Object.entries(entry)) if (value) out += (out ? " " : "") + key;
			}
			return out;
		}
		//#endregion
		//#region lib/transport.js
		const API = "/api/rich-tracking";
		/** Fire one operator action; resolves {ok, delivered} or throws with the host's error. */
		async function postAction(sessionId, kind, rowId, source, text) {
			const payload = rowId === undefined ? { sessionId, kind } : { sessionId, kind, rowId };
			if (source !== undefined) payload.source = source;
			if (text !== undefined) payload.text = text;
			const res = await fetch(`${API}/action`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(15_000),
			});
			const body = await res.json().catch(() => ({ ok: false, error: "bad-host-response" }));
			if (!res.ok || body.ok !== true) throw new Error(body.error ?? `action failed: HTTP ${res.status}`);
			return body;
		}
		/** Relative "x ago" at minute granularity, capped at "1h+". */
		function relativeMinutes(at, now) {
			const minutes = Math.max(0, Math.floor((now - at) / 60_000));
			if (minutes < 1) return "now";
			if (minutes >= 60) return "1h+";
			return `${minutes}m`;
		}
		//#endregion
		//#region lib/locales.js
		const NS = "rich-tracking";
		const en = {
			"title": "Tracking",
			"board.done": "done",
			"rows": "rows",
			"row.basis": "basis:",
			"tracks.entry": "Tracks",
			"tracks.tooltip": "All tracking boards across workspaces — open, expand, start, and trigger work",
			"tracks.title": "Tracks",
			"tracks.scanning": "Scanning sessions…",
			"tracks.loadFailed": "Failed to load tracks",
			"tracks.staleHost": "host process predates Tracks — restart the dsh web service",
			"tracks.refresh": "Refresh",
			"tracks.close": "Close",
			"tracks.boards": "board(s)",
			"tracks.scanned": "scanned",
			"tracks.empty": "No tracking boards yet — boards appear here once a session calls tracking_write.",
		"tracks.state.playing": "Playing — auto-engages after each turn",
		"tracks.state.running": "Working — agent running",
		"tracks.state.live": "Live — waiting",
		"tracks.state.offline": "Offline — stored session (actions wake it)",
		"tracks.state.done": "Complete",
		"tracks.blocked": "blocked rows",
		"tracks.open": "Open this session",
		"tracks.confirmDismiss": "rows still open — press again to close",
		"tracks.waking": "Waking session…",
		"tracks.play": "Play",
		"tracks.pause": "Pause",
		"row.items": "items",
		"row.expand": "show row items",
		"row.collapse": "hide row items",
		"row.record.open": "show full row record",
		"row.record.close": "Close",
		"row.record.hint": "Open this row's full record — context, acceptance items, sources — in a dialog.",
		"record.title": "Row record",
		"record.note": "Latest note",
		"record.evidence": "Evidence basis",
		"record.detail": "Detail",
		"record.items": "Acceptance items",
		"record.sources": "Sources",
		"record.refs": "External refs — why this direction",
		"record.empty": "No detail yet — press Scout, or ask the agent to fill this row's context.",
		"action.scout": "Scout",
		"action.scout.hint": "Launch ONE background research subagent carrying the first open row's brief, then queue every other row to it as messages — it researches them one by one (3-6 competitors each) and the condensed knowledge folds back into the rows as detail, sources, and refs.",
			"action.pursue": "Pursue",
			"action.pursue.hint": "Make this row the agent's next focus — lands as an instruction in its next step.",
		"action.delegate": "Delegate",
		"action.delegate.hint": "Hand this row to a background subagent with read/write access — the delegation instruction carries the row's details and progress; the subagent tracks its own board scoped to this task.",
			"action.align": "Align",
			"action.align.hint": "Force a re-derivation of every percent from the named artifacts — the lie-detector pass.",
		"action.realign": "Realign",
		"action.realign.hint": "Rebuild the board against the current design and system — drop stale rows, add missing ones, refresh everything in one write.",
		"action.note": "Note",
		"action.note.hint": "Attach a comment to this row — the agent reads it and takes the action it implies.",
		"note.placeholder": "Note to the agent about this row…",
		"note.send": "Send",
			"action.alignRow.hint": "Re-derive this row's percent from its evidence artifacts.",
			"action.dismiss": "Dismiss",
			"action.dismiss.hint": "Dismiss the whole board (a later tracking_write re-opens it).",
			"action.dismissRow.hint": "Dismiss this row from the board.",
			"action.checkpoint": "Checkpoint",
			"action.play": "Play — auto-engage highest-value work after each turn",
			"action.pause": "Pause — stop auto-engaging",
			"action.checkpoint.hint": "Ask the agent to take a tracking checkpoint now (host captures git + board).",
			"checkpoint.title": "checkpoint",
			"checkpoint.since": "since checkpoint",
			"checkpoint.commits": "commits",
		"checkpoint.expectNext": "expected next",
			"checkpoint.gitUnavailable": "git state unavailable",
			"checkpoint.dirty": "dirty",
			"checkpoint.clean": "clean",
			"completed.toggle": "Completed",
			"completed.toggleHint": "Rows that reached 100% — kept as the project record",
			"completed.empty": "nothing yet",
			"status.delivered": "delivered",
			"status.steer": "lands at the next step boundary",
			"status.followup": "opens a new turn",
			"status.inject": "delivered quietly",
			"error.offline": "Session offline — copy the instruction into the composer instead.",
			"error.generic": "Action failed",
			"decision.pursue": "pursue",
			"decision.align": "align",
			"decision.play": "play",
			"decision.pause": "pause",
			"decision.delegate": "delegate",
			"decision.scout": "scout",
			"decision.dismiss": "dismiss",
			"decision.dismiss-row": "dismiss row",
			"decision.checkpoint-request": "checkpoint",
			"ago": "ago"
		};
		const zh = {
			"title": "进度",
			"board.done": "完成",
			"rows": "行",
			"row.basis": "依据：",
			"tracks.entry": "追踪",
			"tracks.tooltip": "所有工作区的追踪板——查看、展开、启动与触发",
			"tracks.title": "追踪",
			"tracks.scanning": "扫描会话中…",
			"tracks.loadFailed": "加载追踪板失败",
			"tracks.staleHost": "宿主进程早于 Tracks——请重启 dsh web 服务",
			"tracks.refresh": "刷新",
			"tracks.close": "关闭",
			"tracks.boards": "块板",
			"tracks.scanned": "已扫描",
			"tracks.empty": "还没有追踪板——会话调用 tracking_write 后会出现在这里。",
		"tracks.state.playing": "播放中——每回合自动推进",
		"tracks.state.running": "工作中——agent 运行中",
		"tracks.state.live": "在线——待命",
		"tracks.state.offline": "离线——已存档会话（动作会自动唤醒）",
		"tracks.state.done": "已完成",
		"tracks.blocked": "行受阻",
		"tracks.open": "打开该会话",
		"tracks.confirmDismiss": "个行仍未完成——再按一次关闭",
		"tracks.waking": "正在唤醒会话…",
		"tracks.play": "启动",
		"tracks.pause": "暂停",
		"row.items": "项",
		"row.expand": "展开行内条目",
		"row.collapse": "收起行内条目",
		"row.record.open": "查看行完整记录",
		"row.record.close": "关闭",
		"row.record.hint": "在对话框中打开该行的完整记录——上下文、验收条目、来源。",
		"record.title": "行记录",
		"record.note": "最新备注",
		"record.evidence": "证据依据",
		"record.detail": "详情",
		"record.items": "验收条目",
		"record.sources": "来源",
		"record.refs": "外部参考——方向依据",
		"record.empty": "还没有详情——按调研，或让 agent 填充该行的上下文。",
		"action.scout": "调研",
		"action.scout.hint": "启动一个后台调研子代理，携带第一个未完成行的完整简报，其余行以消息形式排入同一代理——它逐行调研（每行对比 3-6 家竞品），浓缩后的知识以详情、来源与外部参考回填到行上。",
			"action.pursue": "推进",
			"action.pursue.hint": "让这一行成为 agent 的下一个工作重点——作为指令送达它的下一步。",
		"action.delegate": "委派",
		"action.delegate.hint": "把这一行交给拥有读写权限的后台子代理——委派指令携带该行的详情与进度；子代理在自己的会话里维护只属于此任务的看板。",
			"action.align": "对齐",
			"action.align.hint": "强制从证据工件重新推导所有百分比——测谎通道。",
		"action.realign": "重对齐",
		"action.realign.hint": "按当前设计与系统重建看板——删去过时行、补上缺失行、一次写入全部刷新。",
		"action.note": "备注",
		"action.note.hint": "给这一行附一条备注——agent 阅读后执行备注所要求的动作。",
		"note.placeholder": "给 agent 的行备注……",
		"note.send": "发送",
			"action.alignRow.hint": "从该行的证据工件重新推导其百分比。",
			"action.dismiss": "关闭",
			"action.dismiss.hint": "关闭整个看板（之后任何 tracking_write 会重新打开它）。",
			"action.dismissRow.hint": "从看板上移除该行。",
			"action.checkpoint": "检查点",
			"action.play": "播放——每回合自动推进最高价值工作",
			"action.pause": "暂停——停止自动推进",
			"action.checkpoint.hint": "让 agent 现在就打一个进度检查点（宿主抓取 git + 看板）。",
			"checkpoint.title": "检查点",
			"checkpoint.since": "自检查点以来",
			"checkpoint.commits": "个提交",
		"checkpoint.expectNext": "下一检查点应达成",
			"checkpoint.gitUnavailable": "git 状态不可用",
			"checkpoint.dirty": "处未提交",
			"checkpoint.clean": "干净",
			"completed.toggle": "已完成",
			"completed.toggleHint": "达到 100% 的行——作为项目记录保留",
			"completed.empty": "暂无",
			"status.delivered": "已送达",
			"status.steer": "将在下一步边界生效",
			"status.followup": "开启新回合",
			"status.inject": "已静默送达",
			"error.offline": "会话离线——请把指令复制到输入框手动发送。",
			"error.generic": "操作失败",
			"decision.pursue": "推进",
			"decision.align": "对齐",
			"decision.play": "播放",
			"decision.pause": "暂停",
			"decision.delegate": "委托",
			"decision.scout": "调研",
			"decision.dismiss": "关闭",
			"decision.dismiss-row": "移除行",
			"decision.checkpoint-request": "检查点",
			"ago": "前"
		};
		//#endregion
		//#region lib/styles.css
		const css = `.rt-root{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;flex:none;margin:0 auto;overflow:hidden}
.rt-list{scrollbar-width:none}
.rt-list::-webkit-scrollbar{display:none;width:0;height:0}
.rt-root,.rt-root *{box-sizing:border-box}
.rt-body{flex-direction:column;gap:0;padding:6px 0 6px;display:flex}
.rt-header{text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:10px;width:100%;padding:0 12px;display:flex}
.rt-header:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;border-radius:8px}
.rt-disc{flex:none;width:14px;height:14px;border-radius:50%;background:conic-gradient(var(--rt-fill-color) var(--rt-percent), var(--dsw-alias-interactive-bg-hover) 0);position:relative}
.rt-disc:after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--dsw-specific-tip)}
.rt-title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}
.rt-progress{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;font-weight:400;line-height:20px;overflow:hidden}
.rt-chip{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);border-radius:6px;padding:0 6px;font-size:11px;line-height:16px;flex:none}
.rt-headerActions{flex:none;align-items:stretch;display:flex;align-self:stretch;margin:-6px -12px 0 0}
.rt-root:not([data-expanded]) .rt-headerActions{margin-bottom:-6px}
.rt-headerActions .rt-iconBtn{width:34px;height:auto;min-height:36px;border-radius:0;border-left:1px solid var(--dsw-alias-border-l1)}
.rt-headerActions .rt-chevron{border-left:1px solid var(--dsw-alias-border-l1);width:34px}
.rt-headerActions .rt-playBtn{color:var(--dsw-alias-state-success-primary)}
.rt-headerActions .rt-playBtn svg{animation:rt-play-pulse 2s ease-in-out infinite}
@keyframes rt-play-pulse{0%,100%{opacity:1}50%{opacity:.5}}
.rt-iconBtn{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;place-items:center;padding:0;display:grid}
.rt-iconBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.rt-iconBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.rt-iconBtn:disabled{opacity:.45;cursor:default}
.rt-chevron{color:var(--dsw-alias-label-tertiary);flex:none;place-items:center;display:grid}
.rt-list{flex-direction:column;gap:0;max-height:180px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}
.rt-row:hover,.rt-row:focus-within,.rt-rowOpen{background:var(--dsw-alias-interactive-bg-hover)}
.rt-list .rt-row:last-child{border-bottom:none}
.rt-row{border-radius:0;align-items:flex-start;gap:10px;width:100%;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);display:flex}
.rt-rowDim{opacity:.55}
.rt-rowHasItems{cursor:pointer}
.rt-rowHasItems:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.rt-rowChevron{color:var(--dsw-alias-label-tertiary);flex:none;align-self:center;place-items:center;display:grid}
.rt-itemCount{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums;flex:none}
.rt-itemList{border-left:2px solid var(--dsw-alias-border-l1);margin:3px 0 1px 1px;padding-left:8px;flex-direction:column;gap:1px;display:flex;max-height:220px;overflow-y:auto;scrollbar-width:thin;mask-image:linear-gradient(to bottom,#000 calc(100% - 14px),transparent)}
.rt-item{align-items:flex-start;gap:7px;min-width:0;display:flex}
.rt-itemGlyph{color:inherit;flex:none;place-items:center;width:14px;height:14px;margin-top:1px;display:grid}
.rt-itemDone{color:var(--dsw-alias-label-caption)}
.rt-itemOpen{color:var(--dsw-alias-state-business-primary)}
.rt-itemLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;min-width:0;overflow-wrap:anywhere}
.rt-itemDone .rt-itemLabel{color:var(--dsw-alias-label-caption);text-decoration:line-through;text-decoration-thickness:1px}
.rt-glyph{flex:none;place-items:center;width:16px;height:16px;margin-top:2px;display:grid}
.rt-glyphDone{color:var(--dsw-alias-state-success-primary)}
.rt-glyphActive{color:var(--dsw-alias-state-business-primary)}
.rt-glyphActive svg{animation:rt-spin 1s linear infinite}
.rt-glyphBlocked{color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-state-error-primary))}
.rt-glyphPending{color:var(--dsw-alias-label-caption)}
@keyframes rt-spin{to{transform:rotate(360deg)}}
.rt-rowMain{min-width:0;flex:auto;display:flex;flex-direction:column;gap:1px}
.rt-rowLine{display:flex;align-items:center;gap:8px;min-width:0}
.rt-rowLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:400;line-height:20px;text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}
.rt-rowPercent{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;flex:none;min-width:34px;text-align:right}
.rt-bar{width:64px;height:3px;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;overflow:hidden;flex:none;align-self:center}
.rt-barFill{height:100%;background:var(--dsw-alias-state-business-primary);border-radius:999px;transition:width 160ms ease}
.rt-rowDim .rt-barFill{background:var(--dsw-alias-state-success-primary)}
.rt-rowActions{flex:none;align-items:center;gap:2px;display:flex;visibility:hidden}
.rt-row:hover .rt-rowActions,.rt-row:focus-within .rt-rowActions{visibility:visible}
.rt-rowNote{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;overflow-wrap:anywhere}
.rt-noteInput{display:flex;gap:6px;width:100%;margin-top:2px}
.rt-noteInput input{flex:1;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:17px;padding:3px 8px;border-radius:6px;outline:none}
.rt-noteInput input:focus{border-color:var(--dsw-alias-state-business-primary)}
.rt-noteInput button{flex:none;border:1px solid var(--dsw-alias-border-l2);background:0 0;border-radius:6px;padding:2px 10px;font:inherit;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.rt-noteInput button:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.rt-rowEvidence{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;overflow-wrap:anywhere;opacity:.85}
.rt-checkpoint{border-top:1px solid var(--dsw-alias-border-l1);padding:0;display:flex;flex-direction:column}
.rt-cpLine{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;overflow-wrap:anywhere;padding:8px 12px 0}
.rt-completed{border-top:1px solid var(--dsw-alias-border-l1);padding:0;display:flex;flex-direction:column}
.rt-completedHead{display:flex;align-items:center;gap:6px;width:100%;background:0 0;border:none;cursor:pointer;padding:4px 12px;font:inherit;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);text-align:left}
.rt-completedHead:hover{color:var(--dsw-alias-label-secondary)}
.rt-completedCount{color:var(--dsw-alias-state-success-primary)}
.rt-completedList{background:var(--dsw-alias-markdown-code-block);padding:2px 0 6px;display:flex;flex-direction:column}
.rt-completedRow{display:flex;align-items:center;gap:6px;padding:3px 12px}
.rt-completedLabel{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt-completedRow .rt-iconBtn{visibility:hidden}
.rt-completedRow:hover .rt-iconBtn,.rt-completedRow:focus-within .rt-iconBtn{visibility:visible}
.rt-status{min-height:16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;padding:0 12px}
.rt-statusOk{color:var(--dsw-alias-state-success-primary)}
.rt-statusError{color:var(--dsw-alias-state-error-primary)}
.rt-scrim{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:24px}
.rt-record{width:100%;max-width:720px;max-height:min(88vh,900px);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.rt-record,.rt-record *{box-sizing:border-box}
.rt-recordHead{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.rt-recordTitle{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px;overflow-wrap:anywhere}
.rt-recordPct{flex:none;color:var(--dsw-alias-state-business-primary);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.rt-recordClose{flex:none;width:28px;height:28px}
.rt-recordBody{flex:1;min-height:0;overflow-y:auto;padding:10px 16px 14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}
.rt-recordMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px}
.rt-recordSection{display:flex;flex-direction:column;gap:3px}
.rt-recordLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;text-transform:uppercase;letter-spacing:.05em}
.rt-recordLabel svg{vertical-align:-2px;margin-right:2px}
.rt-recordText{color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:17px;overflow-wrap:anywhere}
.rt-recordMd{color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:18px;overflow-wrap:anywhere}
.rt-recordEmpty{color:var(--dsw-alias-label-caption);font-size:12.5px;line-height:17px;font-style:italic}
.rt-recordItems{border-left:2px solid var(--dsw-alias-border-l1);padding-left:8px;display:flex;flex-direction:column;gap:1px}
.rt-recordSources{display:flex;flex-direction:column;gap:3px}
.rt-recordSource{color:var(--dsw-alias-state-business-primary);font-size:12.5px;line-height:17px;overflow-wrap:anywhere;text-decoration:none}
.rt-recordSource:hover{text-decoration:underline}`;
		const tagId = "dsh-rich-tracking/board.css";
		if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-rich-tracking";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region lib/components.js
		/** Glyphs cloned from the built-in TodoPanel (native SVGs, not primitive icons): gradient spinner ring, circle-check, dashed pending ring. */
		function ProgressGlyph() {
			const gradientId = (0, react.useId)();
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true",
				children: [
					(0, react_jsx_runtime.jsx)("defs", { children: (0, react_jsx_runtime.jsxs)("linearGradient", {
						id: gradientId, x1: "2.5", y1: "12", x2: "10.5", y2: "3.5", gradientUnits: "userSpaceOnUse",
						children: [
							(0, react_jsx_runtime.jsx)("stop", { stopColor: "currentColor" }),
							(0, react_jsx_runtime.jsx)("stop", { offset: "1", stopColor: "currentColor", stopOpacity: "0" })
						]
					}) }),
					(0, react_jsx_runtime.jsx)("circle", { cx: "7", cy: "7", r: "6.4", stroke: `url(#${gradientId})`, strokeWidth: "1.2" })
				]
			});
		}
		function CompletedGlyph() {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true",
				children: [
					(0, react_jsx_runtime.jsx)("circle", { cx: "7", cy: "7", r: "6.4", stroke: "currentColor", strokeWidth: "1.2" }),
					(0, react_jsx_runtime.jsx)("path", { d: "M10.9631 5.71411L7.70154 8.97571C7.48011 9.19714 7.27736 9.40099 7.09229 9.54993C6.89742 9.70669 6.66314 9.85279 6.3634 9.90027C6.2049 9.92534 6.04339 9.92534 5.88489 9.90027C5.58515 9.85279 5.35087 9.70669 5.15601 9.54993C4.97093 9.40099 4.76818 9.19714 4.54675 8.97571L3.03516 7.46411L3.96313 6.53613L5.47473 8.04773C5.7169 8.28989 5.86196 8.43389 5.97888 8.52795C6.08597 8.61409 6.10875 8.60701 6.08997 8.604C6.11259 8.60758 6.13571 8.60758 6.15833 8.604C6.13954 8.60701 6.16232 8.61409 6.26941 8.52795C6.38633 8.43389 6.53139 8.28989 6.77356 8.04773L10.0352 4.78613L10.9631 5.71411Z", fill: "currentColor" })
				]
			});
		}
		function PendingGlyph() {
			return (0, react_jsx_runtime.jsx)("svg", {
				width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": "true",
				children: (0, react_jsx_runtime.jsx)("circle", { cx: "7", cy: "7", r: "6.4", stroke: "currentColor", strokeWidth: "1.2", strokeDasharray: "2.4 2.4" })
			});
		}
		/** Row status glyph, TodoPanel grammar: gradient spinner for active, circle-check for done, warning for blocked, dashed ring for pending. */
		function RowGlyph({ status }) {
			if (status === "done") return (0, react_jsx_runtime.jsx)("span", { className: "rt-glyph rt-glyphDone", children: (0, react_jsx_runtime.jsx)(CompletedGlyph, {}) });
			if (status === "active") return (0, react_jsx_runtime.jsx)("span", { className: "rt-glyph rt-glyphActive", children: (0, react_jsx_runtime.jsx)(ProgressGlyph, {}) });
			if (status === "blocked") return (0, react_jsx_runtime.jsx)("span", { className: "rt-glyph rt-glyphBlocked", children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 }) });
			return (0, react_jsx_runtime.jsx)("span", { className: "rt-glyph rt-glyphPending", children: (0, react_jsx_runtime.jsx)(PendingGlyph, {}) });
		}
		/** Delegate icon: the person/agent glyph when the runtime primitives carry it, queue glyph as fallback. */
		const DelegateIcon = _deepseek_ai_dsh_client_ui_primitives.IconUserOutline16 ?? _deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14;
		/** Tooltip-wrapped icon action (exemplar PreflightButton pattern: 500ms tooltip naming verb + consequence). */
		function ActionButton({ label, hint, disabled, onClick, children }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: hint,
				side: "top",
				delayMs: 500,
				children: (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rt-iconBtn",
					"aria-label": label,
					disabled,
					onClick: (event) => { event.stopPropagation(); onClick(); },
					children
				})
			});
		}
		/** One board row: glyph, label, mini progressbar, percent, hover-revealed record "?" + pursue/delegate/align/dismiss. Rows carrying `items` expand on click/Enter to show the acceptance checklist — done items grey + strikethrough, open items primary. */
		function BoardRow({ row, busy, onAction, onRecord, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [noting, setNoting] = (0, react.useState)(false);
			const [noteText, setNoteText] = (0, react.useState)("");
			const submitNote = () => {
				const text = noteText.trim();
				setNoting(false);
				setNoteText("");
				if (text !== "") onAction("note", row.id, text);
			};
			const items = Array.isArray(row.items) ? row.items : [];
			const hasItems = items.length > 0;
			const doneCount = items.filter((item) => item.done === true).length;
			const toggle = () => setOpen((value) => !value);
			const expandProps = hasItems === true ? {
				role: "button",
				tabIndex: 0,
				"aria-expanded": open,
				"aria-label": `${row.label} — ${open === true ? t("row.collapse") : t("row.expand")}`,
				onClick: toggle,
				onKeyDown: (event) => {
					if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggle(); }
					else if (event.key === "Escape" && open === true) { event.stopPropagation(); setOpen(false); }
				}
			} : {};
			return (0, react_jsx_runtime.jsxs)("li", {
				className: cx("rt-row", row.dimmed && "rt-rowDim", hasItems && "rt-rowHasItems", open && "rt-rowOpen"),
				"data-status": row.status,
				...expandProps,
				children: [
					(0, react_jsx_runtime.jsx)(RowGlyph, { status: row.status }),
					(0, react_jsx_runtime.jsxs)("span", {
						className: "rt-rowMain",
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: "rt-rowLine",
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: "rt-rowLabel", title: row.label, children: row.label }),
									(0, react_jsx_runtime.jsx)("span", {
										className: "rt-bar",
										role: "progressbar",
										"aria-valuemin": 0,
										"aria-valuemax": 100,
										"aria-valuenow": row.percent,
										"aria-label": row.label,
										children: (0, react_jsx_runtime.jsx)("span", { className: "rt-barFill", style: { width: `${row.percent}%` } })
									}),
									(0, react_jsx_runtime.jsx)("span", { className: "rt-rowPercent", children: `${row.percent}%` }),
									hasItems === true ? (0, react_jsx_runtime.jsx)("span", { className: "rt-itemCount", children: `${doneCount}/${items.length} ${t("row.items")}` }) : null
								]
							}),
							row.note !== undefined ? (0, react_jsx_runtime.jsx)("span", { className: "rt-rowNote", children: row.note }) : null,
							row.evidence !== undefined ? (0, react_jsx_runtime.jsx)("span", { className: "rt-rowEvidence", children: `${t("row.basis")} ${row.evidence}` }) : null,
							noting === true ? (0, react_jsx_runtime.jsxs)("span", {
								className: "rt-noteInput",
								children: [
									(0, react_jsx_runtime.jsx)("input", {
										value: noteText,
										placeholder: t("note.placeholder"),
										maxLength: 500,
										spellCheck: false,
										autoFocus: true,
										onChange: (event) => setNoteText(event.target.value),
										onKeyDown: (event) => {
											event.stopPropagation();
											if (event.key === "Enter") { event.preventDefault(); submitNote(); }
											if (event.key === "Escape") { event.stopPropagation(); setNoting(false); }
										},
									}),
									(0, react_jsx_runtime.jsx)("button", { type: "button", onClick: submitNote, children: t("note.send") })
								]
							}) : null,
							open === true && hasItems === true ? (0, react_jsx_runtime.jsx)("span", {
								className: "rt-itemList",
								children: items.map((item, index) => (0, react_jsx_runtime.jsxs)("span", {
									className: cx("rt-item", item.done === true ? "rt-itemDone" : "rt-itemOpen"),
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-itemGlyph", children: item.done === true ? (0, react_jsx_runtime.jsx)(CompletedGlyph, {}) : (0, react_jsx_runtime.jsx)(PendingGlyph, {}) }),
										(0, react_jsx_runtime.jsx)("span", { className: "rt-itemLabel", children: item.label })
									]
								}, index))
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: "rt-rowActions",
						children: [
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("action.note"),
								hint: t("action.note.hint"),
								disabled: busy,
								onClick: () => setNoting((value) => !value),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, { size: 14 })
							}),
							hasItems === true ? (0, react_jsx_runtime.jsx)(ActionButton, {
								label: open === true ? t("row.collapse") : t("row.expand"),
								hint: open === true ? t("row.collapse") : t("row.expand"),
								disabled: false,
								onClick: toggle,
								children: open === true ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {})
							}) : null,
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("row.record.open"),
								hint: t("row.record.hint"),
								disabled: busy,
								onClick: () => onRecord(row),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, {})
							}),
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("action.pursue"),
								hint: t("action.pursue.hint"),
								disabled: busy,
								onClick: () => onAction("pursue", row.id),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline14, {})
							}),
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("action.delegate"),
								hint: t("action.delegate.hint"),
								disabled: busy,
								onClick: () => onAction("delegate", row.id),
								children: (0, react_jsx_runtime.jsx)(DelegateIcon, { size: 14 })
							}),
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("action.align"),
								hint: t("action.alignRow.hint"),
								disabled: busy,
								onClick: () => onAction("align", row.id),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
							}),
							(0, react_jsx_runtime.jsx)(ActionButton, {
								label: t("action.dismiss"),
								hint: t("action.dismissRow.hint"),
								disabled: busy,
								onClick: () => onAction("dismiss-row", row.id),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
							})
						]
					})
				]
			});
		}
		/**
		 * The checkpoint strip: one line of frozen git truth + the
		 * since-checkpoint delta. The frozen row snapshot itself stays in the
		 * durable record (.dsh/tracking/<sessionId>.json carries the full
		 * checkpoint timeline) — the operator 2026-09-07 read is the line,
		 * not a restatement of every row percent (operator: "the frozen
		 * snapshot row seems unnecessary").
		 */
		function CheckpointStrip({ view, t }) {
			const cp = view.lastCheckpoint;
			const since = view.sinceCheckpoint;
			if (cp === undefined) return null;
			const before = view.overallPercent - (since?.percentDelta ?? 0);
			// The checkpoint's own words ride the tooltip: the milestone
			// summary and the falsifiable expectation the next checkpoint
			// must close on (the prediction-verification loop, host-pinned).
			const tip = [
				cp.summary !== null && cp.summary !== undefined ? cp.summary : null,
				cp.expect !== null && cp.expect !== undefined ? `\u2192 ${t("checkpoint.expectNext")}: ${cp.expect}` : null,
			].filter((part) => part !== null).join("\n");
			return (0, react_jsx_runtime.jsx)("div", {
				className: "rt-checkpoint",
				children: (0, react_jsx_runtime.jsx)("span", {
					className: "rt-cpLine",
					title: tip === "" ? undefined : tip,
					children: `${cp.label !== null && cp.label !== undefined ? `"${cp.label}"` : t("checkpoint.title")} \u00b7 ${new Date(cp.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} \u00b7 ${cp.git !== null && cp.git !== undefined ? `${cp.git.branch}@${cp.git.head.slice(0, 7)}${cp.git.dirtyCount > 0 ? ` \u00b7 ${cp.git.dirtyCount} ${t("checkpoint.dirty")}` : ""}` : t("checkpoint.gitUnavailable")} \u00b7 ${t("checkpoint.since")}: ${since?.commitsAhead !== null && since?.commitsAhead !== undefined ? `+${since.commitsAhead} ${t("checkpoint.commits")} \u00b7 ` : ""}${before}% \u2192 ${view.overallPercent}%`
				})
			});
		}
		/**
		 * The completed partition: rows at 100% leave the live list the moment
		 * they land (the agent moving a row to 100 IS the auto-close — no
		 * manual step), folding into this collapsed record. Expanding shows
		 * one compact line per completed row (label only — the frozen record
		 * keeps everything else); hover offers dismiss for the rare manual
		 * removal. The strip stays out of the way until there is history.
		 */
		function CompletedStrip({ rows, busy, onAction, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			if (rows.length === 0) return null;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "rt-completed",
				children: [
					(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "rt-completedHead",
						"aria-expanded": open,
						"aria-label": `${t("completed.toggle")} — ${rows.length}`,
						onClick: () => setOpen((value) => !value),
						children: [
							open === true ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {}),
							(0, react_jsx_runtime.jsx)("span", { className: "rt-completedCount", children: `${rows.length} ${t("completed.toggle")}` }),
							(0, react_jsx_runtime.jsx)("span", { children: t("completed.toggleHint") })
						]
					}),
					open === true ? (0, react_jsx_runtime.jsx)("div", {
						className: "rt-completedList",
						children: rows.map((row) => (0, react_jsx_runtime.jsxs)("span", {
							className: "rt-completedRow",
							children: [
								(0, react_jsx_runtime.jsx)(CompletedGlyph, {}),
								(0, react_jsx_runtime.jsx)("span", { className: "rt-completedLabel", title: row.label, children: row.label }),
								(0, react_jsx_runtime.jsx)(ActionButton, {
									label: t("action.dismiss"),
									hint: t("action.dismissRow.hint"),
									disabled: busy,
									onClick: () => onAction("dismiss-row", row.id),
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
								})
							]
						}, row.id))
					}) : null
				]
			});
		}
		//#endregion
		//#region lib/RowRecordDialog.js
		/**
		 * The row's full record dialog (v0.4): everything tracking_write can say
		 * about ONE row — status line, latest note, evidence basis, the long-form
		 * detail (markdown), the acceptance checklist, and clickable sources —
		 * the "?" affordance on each row. Modal over the dock (scrim + card, the
		 * Tracks-panel grammar), Escape / scrim click / close button dismiss it.
		 */
		function RowRecordDialog({ row, revision, onClose, t }) {
			(0, react.useEffect)(() => {
				const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
				document.addEventListener("keydown", onKey, true);
				return () => document.removeEventListener("keydown", onKey, true);
			}, [onClose]);
			const items = Array.isArray(row.items) ? row.items : [];
			const doneCount = items.filter((item) => item.done === true).length;
			const sources = Array.isArray(row.sources) ? row.sources : [];
			const refs = Array.isArray(row.refs) ? row.refs : [];
			const hasDetail = typeof row.detail === "string" && row.detail.trim() !== "";
			return (0, react_jsx_runtime.jsx)("div", {
				className: "rt-scrim",
				onClick: (event) => { if (event.target === event.currentTarget) onClose(); },
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: "rt-record",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": `${row.label} — ${t("record.title")}`,
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: "rt-recordHead",
							children: [
								(0, react_jsx_runtime.jsx)(RowGlyph, { status: row.status }),
								(0, react_jsx_runtime.jsx)("span", { className: "rt-recordTitle", children: row.label }),
								(0, react_jsx_runtime.jsx)("span", { className: "rt-recordPct", children: `${row.percent}%` }),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rt-iconBtn rt-recordClose",
									"aria-label": t("row.record.close") ?? undefined,
									autoFocus: true,
									onClick: onClose,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
								})
							]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "rt-recordBody",
							children: [
								(0, react_jsx_runtime.jsx)("span", { className: "rt-recordMeta", children: `${row.id} · board r${revision} · ${row.status}` }),
								row.note !== undefined ? (0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordLabel", children: t("record.note") }),
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordText", children: row.note })
									]
								}) : null,
								row.evidence !== undefined ? (0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordLabel", children: t("record.evidence") }),
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordText", children: row.evidence })
									]
								}) : null,
								(0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordLabel", children: t("record.detail") }),
										hasDetail === true
											? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: row.detail, className: "rt-recordMd" })
											: (0, react_jsx_runtime.jsx)("span", { className: "rt-recordEmpty", children: t("record.empty") })
									]
								}),
								items.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordLabel", children: `${t("record.items")} · ${doneCount}/${items.length}` }),
										(0, react_jsx_runtime.jsx)("span", {
											className: "rt-recordItems",
											children: items.map((item, index) => (0, react_jsx_runtime.jsxs)("span", {
												className: cx("rt-item", item.done === true ? "rt-itemDone" : "rt-itemOpen"),
												children: [
													(0, react_jsx_runtime.jsx)("span", { className: "rt-itemGlyph", children: item.done === true ? (0, react_jsx_runtime.jsx)(CompletedGlyph, {}) : (0, react_jsx_runtime.jsx)(PendingGlyph, {}) }),
													(0, react_jsx_runtime.jsx)("span", { className: "rt-itemLabel", children: item.label })
												]
											}, index))
										})
									]
								}) : null,
								sources.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsx)("span", { className: "rt-recordLabel", children: t("record.sources") }),
										(0, react_jsx_runtime.jsx)("span", {
											className: "rt-recordSources",
											children: sources.map((source, index) => {
												const href = /^https?:\/\//i.test(source) === true ? source : null;
												return (0, react_jsx_runtime.jsx)("a", {
													className: "rt-recordSource",
													href: href ?? undefined,
													target: href !== null ? "_blank" : undefined,
													rel: "noreferrer noopener",
													children: source
												}, index);
											})
										})
									]
								}) : null,
								refs.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
									className: "rt-recordSection",
									children: [
										(0, react_jsx_runtime.jsxs)("span", {
											className: "rt-recordLabel",
											children: [
												(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline14, { size: 12 }),
												` ${t("record.refs")} · ${refs.length}`
											]
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "rt-recordSources",
											children: refs.map((ref, index) => {
												const href = /^https?:\/\//i.test(ref) === true ? ref : null;
												return (0, react_jsx_runtime.jsx)("a", {
													className: "rt-recordSource rt-recordRef",
													href: href ?? undefined,
													target: href !== null ? "_blank" : undefined,
													rel: "noreferrer noopener",
													children: ref
												}, index);
											})
										})
									]
								}) : null
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region lib/TrackingDock.js
		/**
		 * The scoreboard dock entry (order 5): renders the host-computed
		 * 'tracking' projection. Absent or dismissed board renders nothing
		 * (operator 2026-08-28 — the stub pill was unwanted).
		 * PERSISTENCE FALLBACK: the projection face can read the key absent
		 * while the durable log still carries the board (session restore
		 * serving absent checkpoints, plugin registration timing after a
		 * restart). In that window the dock fetches /board (a log fold,
		 * always truthful) and renders from it, so an active board never
		 * vanishes just because a projection face did; the projection wins
		 * the moment it returns.
		 */
		function TrackingDock({ useProjection, sessionId, t }) {
			const projected = useProjection("tracking");
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [delivered, setDelivered] = (0, react.useState)(null);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(Date.now());
			const [fallbackView, setFallbackView] = (0, react.useState)(null);
			const [recordRow, setRecordRow] = (0, react.useState)(null);
			const view = projected !== null && projected !== undefined && projected.present === true
				? projected
				: fallbackView;
						(0, react.useEffect)(() => {
				let cancelled = false;
				setFallbackView(null);
				if (sessionId === undefined) return () => { cancelled = true; };
				// Persistence fallback ONLY when the projection face is absent:
				// fetching it on every mount while the live projection already
				// supplies the view paid a zstd log decompress per session open
				// for a result the projection then overrode anyway.
				if (projected !== null && projected !== undefined) return () => { cancelled = true; };
				fetch(`${API}/board?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
					.then((res) => (res.ok ? res.json() : null))
					.then((body) => { if (cancelled !== true && body?.ok === true && body.present === true) setFallbackView(body.view ?? null); })
					.catch(() => { /* the projection remains the only source */ });
				return () => { cancelled = true; };
			}, [sessionId]);
			const present = view !== null && view !== undefined && view.present === true;
			(0, react.useEffect)(() => {
				if (present !== true) { setExpanded(false); setError(null); setDelivered(null); setRecordRow(null); }
			}, [present]);
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => setNow(Date.now()), 30_000);
				return () => window.clearInterval(timer);
			}, []);
			// No board in this session, or dismissed: render nothing (operator
			// 2026-08-28 — the stub pill was unwanted). Live boards never vanish
			// mid-work: whole-board dismiss is host-blocked while rows are open.
			if (view === null || view === undefined || view.present !== true) return null;

			const act = (kind, rowId, text) => {
				setBusy(kind + (rowId ?? ""));
				setError(null);
				setDelivered(null);
				postAction(sessionId, kind, rowId, undefined, text).then((body) => {
					setDelivered({ kind, delivered: body.delivered, at: Date.now() });
					setBusy(null);
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
					setBusy(null);
				});
			};

			const fillColor = view.allDone === true ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-business-primary)";
			const counter = view.allDone === true
				? `${view.doneCount}/${view.rows.length} ${t("rows")} \u00b7 ${t("board.done")}`
				: `${view.doneCount}/${view.rows.length} ${t("rows")} \u00b7 ${view.overallPercent}%`;
			// Delivery feedback lives IN the badge (operator: the rt-status line
			// below the board is "not a great place") — "pursue · delivered quietly · now ago".
			const deliveredChip = delivered !== null && now - delivered.at < 10 * 60_000
				? `${t(`decision.${delivered.kind}`)} \u00b7 ${t(`status.${delivered.delivered}`)} \u00b7 ${relativeMinutes(delivered.at, now)} ${t("ago")}`
				: null;
			const decisionChip = deliveredChip !== null ? deliveredChip
				: view.lastDecision !== undefined && now - view.lastDecision.at < 10 * 60_000
					? `${t(`decision.${view.lastDecision.kind}`)} \u00b7 ${relativeMinutes(view.lastDecision.at, now)} ${t("ago")}`
					: null;

			return (0, react_jsx_runtime.jsx)("div", {
				className: "rt-root",
				"data-expanded": expanded ? "true" : undefined,
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: "rt-body",
					onKeyDown: (event) => {
						if (event.key === "Escape" && expanded === true) { event.stopPropagation(); setExpanded(false); }
					},
					children: [
						(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "rt-header",
							"aria-expanded": expanded,
							"aria-controls": "rt-panel",
							onClick: () => setExpanded((value) => !value),
							children: [
								(0, react_jsx_runtime.jsx)("span", { className: "rt-disc", style: { "--rt-percent": `${view.overallPercent * 3.6}deg`, "--rt-fill-color": fillColor }, "aria-hidden": "true" }),
								(0, react_jsx_runtime.jsx)("span", { className: "rt-title", children: t("title") }),
								(0, react_jsx_runtime.jsx)("span", { className: "rt-progress", children: counter }),
								decisionChip !== null ? (0, react_jsx_runtime.jsx)("span", { className: "rt-chip", children: decisionChip }) : null,
								(0, react_jsx_runtime.jsxs)("span", {
									className: "rt-headerActions",
									children: [
										(0, react_jsx_runtime.jsx)(ActionButton, {
											label: view.playMode === true ? t("action.pause") : t("action.play"),
											hint: view.playMode === true ? t("action.pause") : t("action.play"),
											disabled: busy !== null,
											onClick: () => act(view.playMode === true ? "pause" : "play"),
											children: view.playMode === true ? (0, react_jsx_runtime.jsx)("span", { className: "rt-playBtn", children: (0, react_jsx_runtime.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true", children: [(0, react_jsx_runtime.jsx)("rect", { x: "1", y: "1", width: "3.5", height: "10", rx: "0.5", fill: "currentColor" }), (0, react_jsx_runtime.jsx)("rect", { x: "7.5", y: "1", width: "3.5", height: "10", rx: "0.5", fill: "currentColor" })] }) }) : (0, react_jsx_runtime.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true", children: (0, react_jsx_runtime.jsx)("path", { d: "M2.5 1.5v9l8-4.5z", fill: "currentColor" }) })
										}),
										(0, react_jsx_runtime.jsx)(ActionButton, {
											label: t("action.realign"),
											hint: t("action.realign.hint"),
											disabled: busy !== null,
											onClick: () => act("realign"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
										}),
										(0, react_jsx_runtime.jsx)(ActionButton, {
											label: t("action.align"),
											hint: t("action.align.hint"),
											disabled: busy !== null,
											onClick: () => act("align"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
										}),
										view.allDone === true ? null : (0, react_jsx_runtime.jsx)(ActionButton, {
											label: t("action.scout"),
											hint: t("action.scout.hint"),
											disabled: busy !== null,
											onClick: () => act("scout"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {})
										}),
										(0, react_jsx_runtime.jsx)(ActionButton, {
											label: t("action.checkpoint"),
											hint: t("action.checkpoint.hint"),
											disabled: busy !== null,
											onClick: () => act("checkpoint-request"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {})
										}),
										view.allDone === true ? (0, react_jsx_runtime.jsx)(ActionButton, {
											label: t("action.dismiss"),
											hint: t("action.dismiss.hint"),
											disabled: busy !== null,
											onClick: () => act("dismiss"),
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
										}) : null,
										(0, react_jsx_runtime.jsx)("span", { className: "rt-chevron", "aria-hidden": "true", children: expanded ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {}) })
									]
								})
							]
						}),
						expanded ? (0, react_jsx_runtime.jsx)("ul", {
							id: "rt-panel",
							className: "rt-list",
							role: "region",
							"aria-label": t("title"),
							children: view.rows.filter((row) => row.percent < 100).map((row) => (0, react_jsx_runtime.jsx)(BoardRow, { row, busy: busy !== null, onAction: act, onRecord: setRecordRow, t }, row.id))
						}) : null,
						expanded ? (0, react_jsx_runtime.jsx)(CompletedStrip, { rows: view.rows.filter((row) => row.percent === 100), busy: busy !== null, onAction: act, t }) : null,
						expanded && view.lastCheckpoint !== undefined ? (0, react_jsx_runtime.jsx)(CheckpointStrip, { view, t }) : null,
						error !== null ? (0, react_jsx_runtime.jsx)("span", {
							className: "rt-status rt-statusError",
							role: "alert",
							children: error === "session-offline" ? t("error.offline") : `${t("error.generic")}: ${error}`
						}) : null,
						recordRow !== null ? (0, react_jsx_runtime.jsx)(RowRecordDialog, { row: recordRow, revision: view.revision, onClose: () => setRecordRow(null), t }) : null
					]
				})
			});
		}
		//#endregion
		//#region lib/tracks.js
/**
 * Tracks sidebar view v2 (2026-09-07): the dialog opened from the sanctioned
 * sidebar.footer.action slot (the v0.4 MutationObserver/logoRow graft is
 * gone). Status is ICONS in the dock's grammar (color + motion), not text
 * badges; every action works on offline boards by waking the session
 * (sessions.create create-or-adopt resumes the stored session on the host,
 * no navigation), and Open navigates via sessions.open. Dismiss closes any
 * track from here (the route relaxes the open-rows guard for source:dialog).
 */
const TRACKS_ICON = '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="3.2" cy="3.2" r="1.7"/><circle cx="12.8" cy="12.8" r="1.7"/><path d="M4.4 4.4 L7.2 7.2"/><circle cx="8.6" cy="8.6" r="1.4"/><path d="M9.7 9.7 L11.7 11.7"/></svg>';
const ST_SVGS = {
	done: '<svg viewBox="0 0 14 14" width="15" height="15" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6.4" stroke="currentColor" stroke-width="1.2"/><path d="M10.9631 5.71411L7.70154 8.97571C7.48011 9.19714 7.27736 9.40099 7.09229 9.54993C6.89742 9.70669 6.66314 9.85279 6.3634 9.90027C6.2049 9.92534 6.04339 9.92534 5.88489 9.90027C5.58515 9.85279 5.35087 9.70669 5.15601 9.54993C4.97093 9.40099 4.76818 9.19714 4.54675 8.97571L3.03516 7.46411L3.96313 6.53613L5.47473 8.04773C5.7169 8.28989 5.86196 8.43389 5.97888 8.52795C6.08597 8.61409 6.10875 8.60701 6.08997 8.604C6.11259 8.60758 6.13571 8.60758 6.15833 8.604C6.13954 8.60701 6.16232 8.61409 6.26941 8.52795C6.38633 8.43389 6.53139 8.28989 6.77356 8.04773L10.0352 4.78613L10.9631 5.71411Z" fill="currentColor"/></svg>',
	live: '<svg viewBox="0 0 14 14" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="currentColor"/></svg>',
	playing: '<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><rect x="1" y="1" width="3.5" height="10" rx="0.5" fill="currentColor"/><rect x="7.5" y="1" width="3.5" height="10" rx="0.5" fill="currentColor"/></svg>',
	running: '<svg viewBox="0 0 14 14" width="15" height="15" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6.4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="14 40" stroke-linecap="round"/></svg>',
	offline: '<svg viewBox="0 0 14 14" width="15" height="15" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6.4" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.4 2.4"/></svg>',
};
const WARN_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="M8 1.5L15 14.5H1L8 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.5v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="12.6" r="0.7" fill="currentColor"/></svg>';
const OPEN_SVG = '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" aria-hidden="true"><path d="M4 10L10 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 4h5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_SVG = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 1.5v9l8-4.5z" fill="currentColor"/></svg>';
const PAUSE_SVG = ST_SVGS.playing;
const CLOSE_SVG = '<svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const NOTE_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2.5h10v7.5H8.5L5.5 13v-3H3z"/><path d="M5.5 5h5M5.5 7h3.5"/></svg>';
const SEND_SVG = '<svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true"><path d="M1.5 7L12.5 2.5 9 12.5 6.8 8.2 1.5 7Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.8 8.2L12.5 2.5" stroke="currentColor" stroke-width="1.2"/></svg>';
const ROW_SVGS = {
	done: ST_SVGS.done,
	active: ST_SVGS.running,
	blocked: WARN_SVG,
	pending: ST_SVGS.offline,
};
/** One board's derived state: done beats everything, then offline, then the live ladder. */
function boardState(board) {
	if (board.allDone === true) return "done";
	if (board.live !== true) return "offline";
	if (board.agentStatus === "running") return "running";
	if (board.playMode === true) return "playing";
	return "idle";
}
const STATE_ORDER = { running: 0, playing: 1, idle: 2, offline: 3, done: 4 };
const TRACKS_CSS = `.trk2-entry{appearance:none;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;cursor:pointer;text-align:left}
.trk2-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.trk2-entryIcon{display:inline-flex;justify-content:center;align-items:center;width:24px;height:24px;flex:none;color:var(--dsw-alias-label-tertiary)}
.trk2-entryLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-scrim{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:24px}
.trk2-card{width:100%;max-width:880px;max-height:min(92vh,1200px);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.trk2-card,.trk2-card *{box-sizing:border-box}
.trk2-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.trk2-title{font-size:14px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary);flex:none}
.trk2-hint{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-iconBtn{flex:none;width:28px;height:28px;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;font-size:15px}
.trk2-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.trk2-body{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}
.trk2-body::-webkit-scrollbar{display:none}
.trk2-wsHead{display:flex;align-items:baseline;gap:8px;padding:10px 16px 4px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;text-transform:uppercase;letter-spacing:.05em}
.trk2-wsPath{font-family:ui-monospace,monospace;text-transform:none;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-board{border-top:1px solid var(--dsw-alias-border-l1)}
.trk2-boardHead{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px 9px 16px;background:0 0;border:none;cursor:pointer;font:inherit;text-align:left;color:inherit}
.trk2-boardHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.trk2-st{flex:none;display:grid;place-items:center;width:18px;height:18px}
.trk2-stDone,.trk2-stLive,.trk2-stPlaying{color:var(--dsw-alias-state-success-primary)}
.trk2-stPlaying svg{animation:trk2-pulse 2s ease-in-out infinite}
.trk2-stRunning{color:var(--dsw-alias-state-business-primary)}
.trk2-stRunning svg{animation:trk2-spin 1s linear infinite}
.trk2-stOffline{color:var(--dsw-alias-label-caption)}
.trk2-blockedBadge{flex:none;display:grid;place-items:center;width:16px;height:18px;color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-state-error-primary))}
@keyframes trk2-pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes trk2-spin{to{transform:rotate(360deg)}}
.trk2-pct{flex:none;font-size:12px;font-weight:600;color:var(--dsw-alias-state-business-primary);min-width:34px;text-align:right}
.trk2-boardAll .trk2-pct{color:var(--dsw-alias-state-success-primary)}
.trk2-name{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.trk2-title2{color:var(--dsw-alias-label-primary);font-size:13px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-mini{flex:none;width:26px;height:26px;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:6px;cursor:pointer;opacity:.75}
.trk2-mini:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);opacity:1}
.trk2-miniPlayOn{color:var(--dsw-alias-state-success-primary);opacity:1}
.trk2-miniConfirm{color:var(--dsw-alias-state-error-primary);opacity:1}
.trk2-chevron{flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease;display:inline-block}
.trk2-boardOpen .trk2-chevron{transform:rotate(90deg)}
.trk2-rows{display:none;border-top:1px solid var(--dsw-alias-border-l1)}
.trk2-boardOpen .trk2-rows{display:block}
.trk2-row{display:flex;align-items:center;gap:8px;padding:6px 16px 6px 26px;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 60%, transparent)}
.trk2-rowSt{flex:none;display:grid;place-items:center;width:14px;height:14px;color:var(--dsw-alias-label-caption)}
.trk2-rowStActive{color:var(--dsw-alias-state-business-primary)}
.trk2-rowStActive svg{animation:trk2-spin 1s linear infinite}
.trk2-rowStBlocked{color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-state-error-primary))}
.trk2-rowLabel{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-rowDone .trk2-rowLabel,.trk2-rowDone .trk2-rowPct{opacity:.5}
.trk2-status{color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:14px;flex:none}
.trk2-rowPct{flex:none;font-size:11.5px;color:var(--dsw-alias-label-secondary);min-width:30px;text-align:right}
.trk2-rowAct{flex:none;width:24px;height:24px;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:6px;cursor:pointer;visibility:hidden}
.trk2-row:hover .trk2-rowAct,.trk2-row:focus-within .trk2-rowAct{visibility:visible}
.trk2-rowAct:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-business-primary)}
.trk2-noteRow{display:flex;gap:6px;padding:2px 16px 6px 26px}
.trk2-noteRow input{flex:1;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:17px;padding:3px 8px;border-radius:6px;outline:none}
.trk2-noteRow input:focus{border-color:var(--dsw-alias-state-business-primary)}
.trk2-noteRow button{flex:none;border:1px solid var(--dsw-alias-border-l2);background:0 0;border-radius:6px;padding:2px 10px;font:inherit;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.trk2-noteRow button:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.trk2-actions{display:flex;flex-wrap:wrap;gap:4px;padding:7px 16px;border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 60%, transparent)}
.trk2-act{appearance:none;background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 9px;font:inherit;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.trk2-act:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.trk2-act:disabled{opacity:.4;cursor:default}
.trk2-foot2{display:flex;align-items:center;border-top:1px solid var(--dsw-alias-border-l1);padding:6px 12px}
.trk2-footStatus{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk2-empty{padding:24px 16px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}`;

		const tt = (key) => (/^zh/i.test(navigator.language ?? "") ? zh : en)[key] ?? en[key] ?? key;

		async function fetchTracks() {
			const res = await fetch(`${API}/tracks`, { cache: "no-store" });
			const body = await res.text().catch(() => "");
			let parsed = null;
			try { parsed = body === "" ? null : JSON.parse(body) } catch { parsed = null }
			if (parsed === null || parsed.ok !== true) {
				const detail = parsed !== null && typeof parsed.error === "string" ? parsed.error : `HTTP ${res.status}`;
				throw new Error(res.status === 404 ? `${tt("tracks.staleHost")} (${detail})` : detail);
			}
			return parsed;
		}

		/**
		 * Wake an offline board's session WITHOUT navigating: the public
		 * create-or-adopt path (sessions.create({sessionId, cwd})) resumes the
		 * stored session on the host and returns once its agent is live — the
		 * same ensureSession path the harness itself uses.
		 */
		async function wakeBoard(sessionsApi, board) {
			if (typeof sessionsApi?.create !== "function") throw new Error("session service unavailable");
			if (typeof board.cwd === "string" && board.cwd !== "") {
				await sessionsApi.create({ sessionId: board.sessionId, cwd: board.cwd });
				return;
			}
			// No cwd on the summary (header never parsed): adopt cannot verify
			// the directory, so only the listed-session path remains.
			const listed = sessionsApi.list?.getSnapshot?.()?.ids?.includes?.(board.sessionId) === true;
			if (listed !== true) throw new Error("cannot wake: session directory unknown");
		}

		function createTracksPanel(sessionsApi, onCloseParam) {
			let onClose = onCloseParam;
			const scrim = document.createElement("div");
			scrim.className = "trk2-scrim";
			scrim.addEventListener("click", (event) => { if (event.target === scrim) onClose(); });
			const card = document.createElement("div");
			card.className = "trk2-card";
			card.setAttribute("aria-label", tt("tracks.title"));
			const head = document.createElement("div");
			head.className = "trk2-head";
			const title = document.createElement("span");
			title.className = "trk2-title";
			title.textContent = tt("tracks.title");
			const hint = document.createElement("span");
			hint.className = "trk2-hint";
			hint.textContent = tt("tracks.scanning");
			const refreshBtn = document.createElement("button");
			refreshBtn.type = "button";
			refreshBtn.className = "trk2-iconBtn";
			refreshBtn.textContent = "\u27f3";
			refreshBtn.title = tt("tracks.refresh");
			refreshBtn.addEventListener("click", () => load());
			const closeBtn = document.createElement("button");
			closeBtn.type = "button";
			closeBtn.className = "trk2-iconBtn";
			closeBtn.textContent = "\u00d7";
			closeBtn.title = tt("tracks.close");
			closeBtn.addEventListener("click", () => onClose());
			head.append(title, hint, refreshBtn, closeBtn);
			const body = document.createElement("div");
			body.className = "trk2-body";
			const foot = document.createElement("div");
			foot.className = "trk2-foot2";
			const footStatus = document.createElement("span");
			footStatus.className = "trk2-footStatus";
			foot.append(footStatus);
			card.append(head, body, foot);
			scrim.append(card);

			const setStatus = (text, isError) => { footStatus.textContent = text ?? ""; footStatus.style.color = isError === true ? "var(--dsw-alias-state-error-primary)" : ""; };

			let busy = false;
			const act = async (board, kind, rowId, text) => {
				if (busy === true) return;
				busy = true;
				card.querySelectorAll(".trk2-act,.trk2-mini,.trk2-rowAct").forEach((btn) => { btn.disabled = true; });
				try {
					if (board.live !== true) {
						setStatus(tt("tracks.waking"));
						try { await wakeBoard(sessionsApi, board) } catch (cause) {
							setStatus(`${tt("error.generic")}: ${cause instanceof Error ? cause.message : String(cause)}`, true);
							return;
						}
						board.live = true;
					}
					// The host agent materializes asynchronously after adopt;
					// retry the 409 window instead of failing the first beat.
					let result = null;
					for (let attempt = 0; attempt < 20; attempt += 1) {
						try {
							result = await postAction(board.sessionId, kind, rowId, "dialog", text);
							break;
						} catch (cause) {
							if (cause instanceof Error && cause.message !== "session-offline") throw cause;
							if (attempt === 19) throw cause;
							await new Promise((resolve) => setTimeout(resolve, 800));
						}
					}
					if (kind === "play") board.playMode = true;
					if (kind === "pause") board.playMode = false;
					if (kind === "dismiss") {
						lastData.boards = lastData.boards.filter((entry) => entry.sessionId !== board.sessionId);
						expandedBoards.delete(board.sessionId);
						render(lastData);
					} else {
						render(lastData);
						window.setTimeout(() => load(), 1200);
					}
					setStatus(`${board.title ?? board.sessionId.slice(0, 13)} \u2014 ${tt("status.delivered")}: ${tt(`status.${result.delivered}`)}`);
				} catch (cause) {
					setStatus(cause.message === "session-offline" ? tt("error.offline") : `${tt("error.generic")}: ${cause.message}`, true);
					window.setTimeout(() => load(), 1200);
				} finally {
					busy = false;
					card.querySelectorAll(".trk2-act,.trk2-mini,.trk2-rowAct").forEach((btn) => { btn.disabled = false; });
				}
			};

			const openSession = async (board) => {
				try {
					if (board.live !== true) { setStatus(tt("tracks.waking")); await wakeBoard(sessionsApi, board); }
				} catch { /* unlisted+uncwd: open() may still hold for listed sessions */ }
				try { sessionsApi.open(board.sessionId) } catch (cause) {
					setStatus(`${tt("error.generic")}: ${cause instanceof Error ? cause.message : String(cause)}`, true);
					return;
				}
				onClose();
			};

			let lastData = { boards: [], scanned: 0, total: 0 };
			const expandedBoards = new Set();
			const render = (data) => {
				const scroll = body.scrollTop;
				lastData = data;
				body.innerHTML = "";
				hint.textContent = `${data.boards.length} ${tt("tracks.boards")} \u00b7 ${tt("tracks.scanned")} ${data.scanned}/${data.total}`;
				if (data.boards.length === 0) {
					const empty = document.createElement("div");
					empty.className = "trk2-empty";
					empty.textContent = tt("tracks.empty");
					body.append(empty);
					return;
				}
				const byWorkspace = new Map();
				for (const board of data.boards) {
					const key = board.slug ?? "\u2014";
					if (byWorkspace.has(key) === false) byWorkspace.set(key, []);
					byWorkspace.get(key).push(board);
				}
				for (const [slug, boards] of byWorkspace) {
					boards.sort((a, b) => (STATE_ORDER[boardState(a)] ?? 9) - (STATE_ORDER[boardState(b)] ?? 9) || (b.lastWriteAt ?? 0) - (a.lastWriteAt ?? 0));
					const wsHead = document.createElement("div");
					wsHead.className = "trk2-wsHead";
					const wsName = document.createElement("span");
					wsName.textContent = `${slug} \u00b7 ${boards.length}`;
					const wsPath = document.createElement("span");
					wsPath.className = "trk2-wsPath";
					wsPath.textContent = boards[0]?.cwd ?? "";
					wsHead.append(wsName, wsPath);
					body.append(wsHead);
					for (const board of boards) body.append(renderBoard(board));
				}
				body.scrollTop = scroll;
			};

			const renderBoard = (board) => {
				const wrap = document.createElement("div");
				wrap.className = board.allDone === true ? "trk2-board trk2-boardAll" : "trk2-board";
				const headEl = document.createElement("button");
				headEl.type = "button";
				headEl.className = "trk2-boardHead";
				const state = boardState(board);
				const st = document.createElement("span");
				st.className = `trk2-st trk2-st${state.charAt(0).toUpperCase()}${state.slice(1)}`;
				st.innerHTML = ST_SVGS[state] ?? ST_SVGS.offline;
				st.title = tt(`tracks.state.${state}`);
				headEl.append(st);
				const blocked = board.rows.filter((row) => row.status === "blocked").length;
				if (blocked > 0) {
					const badge = document.createElement("span");
					badge.className = "trk2-blockedBadge";
					badge.innerHTML = WARN_SVG;
					badge.title = `${blocked} ${tt("tracks.blocked")}`;
					headEl.append(badge);
				}
				const name = document.createElement("span");
				name.className = "trk2-name";
				const title2 = document.createElement("span");
				title2.className = "trk2-title2";
				title2.textContent = board.title ?? board.sessionId;
				const meta = document.createElement("span");
				meta.className = "trk2-meta";
				const doneCount = board.rows.filter((row) => row.percent === 100).length;
				const age = board.lastWriteAt !== null && board.lastWriteAt !== undefined ? `${relativeMinutes(board.lastWriteAt, Date.now())} ${tt("ago")}` : "\u2014";
				meta.textContent = `r${board.revision} \u00b7 ${doneCount}/${board.rows.length} ${tt("rows")} \u00b7 ${age}`;
				name.append(title2, meta);
				headEl.append(name);
				const pct = document.createElement("span");
				pct.className = "trk2-pct";
				pct.textContent = `${board.overallPercent}%`;
				headEl.append(pct);

				// Action group: Open / Play-Pause / Dismiss. Dismiss is a
				// two-step confirm while open rows remain (color flips red).
				const mini = (svg, label, onClick, extraClass) => {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = cx("trk2-mini", extraClass);
					btn.innerHTML = svg;
					btn.title = label;
					btn.addEventListener("click", (event) => { event.stopPropagation(); onClick(btn); });
					return btn;
				};
				const openBtn = mini(OPEN_SVG, tt("tracks.open"), () => { void openSession(board); });
				const playBtn = mini(board.playMode === true ? PAUSE_SVG : PLAY_SVG, board.playMode === true ? tt("action.pause") : tt("action.play"), () => { void act(board, board.playMode === true ? "pause" : "play"); }, board.playMode === true ? "trk2-miniPlayOn" : undefined);
				const openRows = board.rows.filter((row) => row.percent < 100).length;
				let confirmTimer = null;
				const dismissBtn = mini(CLOSE_SVG, tt("action.dismiss"), (btn) => {
					if (openRows > 0 && btn.dataset.confirm !== "true") {
						btn.dataset.confirm = "true";
						btn.classList.add("trk2-miniConfirm");
						btn.title = `${openRows} ${tt("tracks.confirmDismiss")}`;
						confirmTimer = window.setTimeout(() => { btn.dataset.confirm = "false"; btn.classList.remove("trk2-miniConfirm"); btn.title = tt("action.dismiss"); }, 2600);
						return;
					}
					if (confirmTimer !== null) window.clearTimeout(confirmTimer);
					void act(board, "dismiss");
				});
				const chevron = document.createElement("span");
				chevron.className = "trk2-chevron";
				chevron.textContent = "\u203a";
				headEl.append(openBtn, playBtn, dismissBtn, chevron);
				headEl.addEventListener("click", () => {
					wrap.classList.toggle("trk2-boardOpen");
					if (wrap.classList.contains("trk2-boardOpen") === true) expandedBoards.add(board.sessionId);
					else expandedBoards.delete(board.sessionId);
				});
				if (expandedBoards.has(board.sessionId) === true) wrap.classList.add("trk2-boardOpen");
				const rowsEl = document.createElement("div");
				rowsEl.className = "trk2-rows";
				for (const row of board.rows) {
					const rowEl = document.createElement("div");
					rowEl.className = row.percent === 100 ? "trk2-row trk2-rowDone" : "trk2-row";
					const rowSt = document.createElement("span");
					rowSt.className = row.status === "active" ? "trk2-rowSt trk2-rowStActive" : row.status === "blocked" ? "trk2-rowSt trk2-rowStBlocked" : "trk2-rowSt";
					rowSt.innerHTML = ROW_SVGS[row.status] ?? ROW_SVGS.pending;
					rowSt.title = row.status;
					rowEl.append(rowSt);
					const rowLabel = document.createElement("span");
					rowLabel.className = "trk2-rowLabel";
					rowLabel.textContent = row.label;
					rowLabel.title = row.label;
					rowEl.append(rowLabel);
					if (row.items !== null && row.items !== undefined) {
						const items = document.createElement("span");
						items.className = "trk2-status";
						items.textContent = `${row.items.done}/${row.items.total}`;
						rowEl.append(items);
					}
					const rowPct = document.createElement("span");
					rowPct.className = "trk2-rowPct";
					rowPct.textContent = `${row.percent}%`;
					rowEl.append(rowPct);
					if (row.percent < 100) {
						const pursue = document.createElement("button");
						pursue.type = "button";
						pursue.className = "trk2-rowAct";
						pursue.innerHTML = SEND_SVG;
						pursue.title = `${tt("action.pursue")} \u2014 ${row.label}`;
						pursue.addEventListener("click", () => { void act(board, "pursue", row.id); });
						rowEl.append(pursue);
					}
					const noteBtn = document.createElement("button");
					noteBtn.type = "button";
					noteBtn.className = "trk2-rowAct";
					noteBtn.innerHTML = NOTE_SVG;
					noteBtn.title = tt("action.note.hint");
					noteBtn.addEventListener("click", (event) => {
						event.stopPropagation();
						const existing = rowEl.nextElementSibling;
						if (existing !== null && existing.classList.contains("trk2-noteRow")) { existing.remove(); return; }
						const noteRow = document.createElement("div");
						noteRow.className = "trk2-noteRow";
						const input = document.createElement("input");
						input.maxLength = 500;
						input.placeholder = tt("note.placeholder");
						input.spellcheck = false;
						const send = document.createElement("button");
						send.type = "button";
						send.textContent = tt("note.send");
						const submit = () => {
							const text = input.value.trim();
							noteRow.remove();
							if (text !== "") void act(board, "note", row.id, text);
						};
						send.addEventListener("click", submit);
						input.addEventListener("keydown", (keyEvent) => {
							keyEvent.stopPropagation();
							if (keyEvent.key === "Enter") submit();
							if (keyEvent.key === "Escape") { keyEvent.preventDefault(); noteRow.remove(); }
						});
						noteRow.append(input, send);
						rowEl.after(noteRow);
						input.focus();
					});
					rowEl.append(noteBtn);
					rowsEl.append(rowEl);
				}
				const actions = document.createElement("div");
				actions.className = "trk2-actions";
				const addButton = (label, kind) => {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "trk2-act";
					btn.textContent = label;
					btn.addEventListener("click", () => { void act(board, kind); });
					actions.append(btn);
				};
				addButton(tt("action.checkpoint"), "checkpoint-request");
				addButton(tt("action.align"), "align");
				addButton(tt("action.realign"), "realign");
				if (board.allDone !== true) addButton(tt("action.scout"), "scout");
				rowsEl.append(actions);
				wrap.append(headEl, rowsEl);
				return wrap;
			};

			const load = () => {
				hint.textContent = tt("tracks.scanning");
				fetchTracks().then((data) => {
					render(data);
				}).catch((cause) => { hint.textContent = `${tt("tracks.loadFailed")}: ${cause.message}`; });
			};
			load();
			const autoRefresh = window.setInterval(() => { if (busy === false) load(); }, 12_000);
			const innerClose = onClose;
			onClose = () => { window.clearInterval(autoRefresh); innerClose(); };
			return scrim;
		}

		const TRACKS_ENTRY = "data-dsh-rich-tracking-tracks";
		const TRACKS_FAMILY = ["[data-dsh-taskboard-entry]", "[data-dsh-ssh-entry]", "[data-dsh-skill-explorer-entry]", "[data-dsh-generative-ideas-entry]", "[data-dsh-rich-context-entry]", `[${TRACKS_ENTRY}]`];
		
		function tracksSidebarRoot() {
			const column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
			if (column === null) return undefined;
			return column.querySelector('[class*="logoRow"]')?.parentElement ?? column.firstElementChild ?? undefined;
		}
		function tracksNewSessionButton(root) {
			const nested = root.querySelector('button[class*="newSession"]');
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
			return undefined;
		}
		function mountTracksEntry(onToggle) {
			if (document.querySelector(`[${TRACKS_ENTRY}]`) !== null) return () => {};
			const entry = document.createElement("button");
			entry.type = "button";
			entry.setAttribute(TRACKS_ENTRY, "");
			entry.setAttribute("data-dsh-plugin", "rich-tracking");
			entry.setAttribute("data-dsh-part", "tracks-sidebar-entry");
			entry.className = "trk2-entry";
			const icon = document.createElement("span");
			icon.className = "trk2-entryIcon";
			icon.innerHTML = TRACKS_ICON;
			const text = document.createElement("span");
			text.className = "trk2-entryLabel";
			text.textContent = tt("tracks.entry");
			entry.title = tt("tracks.tooltip");
			entry.append(icon, text);
			entry.addEventListener("click", onToggle);
			let root, placed = false;
			const place = () => {
				const button = root === undefined ? undefined : tracksNewSessionButton(root);
				if (button === undefined) return false;
				const row = button.closest('[class*="logoRow"]');
				const base = row !== null && row.parentElement === root ? row : button;
				const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches(TRACKS_FAMILY.join(", ")));
				const anchor = family.length > 0 ? family[family.length - 1].nextElementSibling : base.nextElementSibling;
				root.insertBefore(entry, anchor);
				return true;
			};
			const tryPlace = () => {
				if (root !== undefined && !root.isConnected) { rootObserver.disconnect(); root = undefined; placed = false; }
				if (placed && document.body.contains(entry)) return;
				root ??= tracksSidebarRoot();
				if (root === undefined) return;
				placed = place();
				if (placed) rootObserver.observe(root, { childList: true, subtree: true });
			};
			const waitObserver = new MutationObserver(tryPlace);
			waitObserver.observe(document.body, { childList: true, subtree: true });
			const rootObserver = new MutationObserver(() => {
				if (root === undefined || !root.isConnected) { placed = false; tryPlace(); return; }
				if (!root.contains(entry)) placed = place();
			});
			tryPlace();
			return () => { waitObserver.disconnect(); rootObserver.disconnect(); entry.remove(); };
		}
		
		function installTracksView(ctx) {
			installTracksStyles();
			let panel = null;
			const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
			const close = () => {
				if (panel !== null) { panel.remove(); panel = null; }
				document.removeEventListener("keydown", onKey, true);
			};
			const toggle = () => {
				if (panel !== null) { close(); return; }
				panel = createTracksPanel(ctx.sessions, () => close());
				document.body.appendChild(panel);
				document.addEventListener("keydown", onKey, true);
			};
			const disposeEntry = mountTracksEntry(toggle);
			return () => { disposeEntry(); close(); };
		}
		

		function installTracksStyles() {
			const tagId = "dsh-rich-tracking/tracks.css";
			if (document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
				const tag = document.createElement("style");
				tag.dataset.pluginCss = tagId;
				tag.textContent = TRACKS_CSS;
				document.head.appendChild(tag);
			}
		}
	//#region lib/index.js
		const inject = ["slots", "locale", "sessions"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { en, zh }), "rich-tracking: dictionaries");
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "tracking",
				order: 5,
				locale: NS
			}, TrackingDock));
			ctx.effect(() => installTracksView(ctx), "rich-tracking: tracks sidebar view");
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
