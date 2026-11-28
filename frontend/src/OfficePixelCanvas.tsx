import { useEffect, useRef, useState } from 'react';
import type { OfficeAgentId } from './office-assets';

type OfficePixelRoom = {
  id: string;
  title: string;
  agents: readonly OfficeAgentId[];
};

type OfficePixelEvent = {
  type: string;
  runId: string;
  room: string;
  status: string;
  timestamp: string;
};

type Props = {
  rooms: readonly OfficePixelRoom[];
  agentLabels: Record<OfficeAgentId, string>;
  events: readonly OfficePixelEvent[];
  selectedAgentId: OfficeAgentId;
  onAgentSelect: (agentId: OfficeAgentId, roomId: string) => void;
};

type RoomRect = { x: number; y: number; w: number; h: number };
type AgentMode = 'idle' | 'walking' | 'working' | 'alert' | 'pingpong';
type HitBox = { x: number; y: number; w: number; h: number; agentId: OfficeAgentId; roomId: string };
type Walk = { key: string; agentId: OfficeAgentId; startedAt: number };

const WIDTH = 960;
const HEIGHT = 560;
const NAVY = '#0A192F';
const CYAN = '#00F0FF';
const ROOM_RECTS: Record<string, RoomRect> = {
  reception: { x: 18, y: 20, w: 292, h: 150 },
  security: { x: 322, y: 20, w: 292, h: 150 },
  customer: { x: 626, y: 20, w: 292, h: 150 },
  classroom: { x: 18, y: 190, w: 292, h: 150 },
  personas: { x: 322, y: 190, w: 292, h: 150 },
  bugger: { x: 626, y: 190, w: 292, h: 150 },
};
const HOME_ROOM: Record<OfficeAgentId, string> = {
  coordinator: 'reception',
  security: 'security',
  supervisor: 'security',
  customer: 'customer',
  professor: 'classroom',
  personas: 'personas',
  bugger: 'bugger',
};
const TRACE_AGENT: Record<string, OfficeAgentId> = {
  reception: 'coordinator',
  security: 'security',
  supervisor: 'supervisor',
  customer: 'customer',
  professor: 'professor',
  classroom: 'professor',
  personas: 'personas',
  bugger: 'bugger',
  lacuna: 'professor',
};
const PINGPONG_AGENTS: readonly OfficeAgentId[] = ['personas', 'bugger'];

function activeAgentFor(event?: OfficePixelEvent): OfficeAgentId | null {
  if (!event) return null;
  if (event.type === 'chat.started') return 'coordinator';
  if (event.type === 'seed.started') return 'personas';
  if (event.type === 'chat.failed') return 'coordinator';
  if (event.type === 'seed.failed') return 'personas';
  if (event.type === 'seed.completed' && isAlert(event.status)) return 'personas';
  if (event.type === 'room.transition') return TRACE_AGENT[event.room] || null;
  return null;
}

function isAlert(status: string): boolean {
  return /BLOCKED|FAIL|REVISION_REQUIRED|ERROR/.test(status);
}

function fillRect(ctx: CanvasRenderingContext2D, color: string, alpha: number, x: number, y: number, w: number, h: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

function strokeRect(ctx: CanvasRenderingContext2D, color: string, alpha: number, x: number, y: number, w: number, h: number): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11): void {
  ctx.fillStyle = CYAN;
  ctx.font = `700 ${size}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), Math.round(x), Math.round(y));
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, w = 54): void {
  fillRect(ctx, CYAN, 0.18, x, y, w, 18);
  strokeRect(ctx, CYAN, 0.82, x, y, w, 18);
  fillRect(ctx, NAVY, 1, x + w / 2 - 9, y - 22, 18, 19);
  strokeRect(ctx, CYAN, 0.95, x + w / 2 - 9, y - 22, 18, 19);
  fillRect(ctx, CYAN, 0.62, x + w / 2 - 6, y - 19, 12, 12);
  fillRect(ctx, CYAN, 0.55, x + 5, y + 20, 3, 10);
  fillRect(ctx, CYAN, 0.55, x + w - 8, y + 20, 3, 10);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillRect(ctx, CYAN, 0.9, x + 6, y + 12, 12, 10);
  fillRect(ctx, NAVY, 1, x + 8, y + 14, 8, 6);
  fillRect(ctx, CYAN, 0.8, x + 10, y + 2, 4, 12);
  fillRect(ctx, CYAN, 0.65, x + 2, y + 5, 10, 4);
  fillRect(ctx, CYAN, 0.65, x + 12, y + 7, 10, 4);
}

function drawRoomFurniture(ctx: CanvasRenderingContext2D, room: OfficePixelRoom, rect: RoomRect): void {
  const y = rect.y + 104;
  const center = rect.x + rect.w / 2;
  if (room.id === 'reception') {
    fillRect(ctx, CYAN, 0.15, center - 62, y, 124, 26);
    strokeRect(ctx, CYAN, 0.9, center - 62, y, 124, 26);
    fillRect(ctx, CYAN, 0.5, center - 36, y + 7, 72, 3);
    drawPlant(ctx, rect.x + 24, rect.y + 70);
  } else if (room.id === 'security') {
    drawDesk(ctx, center - 62, y, 48);
    drawDesk(ctx, center + 14, y, 48);
  } else if (room.id === 'customer') {
    fillRect(ctx, CYAN, 0.15, rect.x + 25, rect.y + 72, 45, 28);
    strokeRect(ctx, CYAN, 0.75, rect.x + 25, rect.y + 72, 45, 28);
    for (let i = 0; i < 3; i++) fillRect(ctx, CYAN, 0.65, rect.x + 32, rect.y + 78 + i * 6, 30, 2);
    drawDesk(ctx, center + 2, y, 54);
  } else if (room.id === 'classroom') {
    fillRect(ctx, CYAN, 0.14, rect.x + 46, rect.y + 54, 200, 30);
    strokeRect(ctx, CYAN, 0.9, rect.x + 46, rect.y + 54, 200, 30);
    fillRect(ctx, CYAN, 0.55, rect.x + 62, rect.y + 66, 104, 3);
    drawDesk(ctx, center - 28, y, 56);
  } else if (room.id === 'personas') {
    fillRect(ctx, CYAN, 0.16, center - 62, y, 124, 20);
    strokeRect(ctx, CYAN, 0.85, center - 62, y, 124, 20);
    for (let i = 0; i < 4; i++) {
      fillRect(ctx, NAVY, 1, center - 44 + i * 24, y - 14, 14, 10);
      strokeRect(ctx, CYAN, 0.75, center - 44 + i * 24, y - 14, 14, 10);
    }
  } else {
    drawDesk(ctx, center - 34, y, 68);
    fillRect(ctx, CYAN, 0.5, rect.x + 28, rect.y + 76, 24, 20);
    strokeRect(ctx, CYAN, 0.75, rect.x + 28, rect.y + 76, 24, 20);
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, room: OfficePixelRoom, active: boolean): void {
  const rect = ROOM_RECTS[room.id];
  if (!rect) return;
  fillRect(ctx, NAVY, 1, rect.x, rect.y, rect.w, rect.h);
  for (let x = rect.x + 8; x < rect.x + rect.w; x += 16) fillRect(ctx, CYAN, 0.08, x, rect.y + 30, 1, rect.h - 34);
  for (let y = rect.y + 34; y < rect.y + rect.h; y += 16) fillRect(ctx, CYAN, 0.08, rect.x + 2, y, rect.w - 4, 1);
  strokeRect(ctx, CYAN, active ? 1 : 0.48, rect.x, rect.y, rect.w, rect.h);
  fillRect(ctx, CYAN, 0.12, rect.x + 2, rect.y + 2, rect.w - 4, 23);
  drawText(ctx, room.title, rect.x + 12, rect.y + 14, 10);
  fillRect(ctx, CYAN, 0.6, rect.x + rect.w / 2 - 16, rect.y + rect.h - 2, 32, 3);
  drawRoomFurniture(ctx, room, rect);
}

function drawLounge(ctx: CanvasRenderingContext2D): void {
  const rect = { x: 18, y: 360, w: 900, h: 180 };
  fillRect(ctx, NAVY, 1, rect.x, rect.y, rect.w, rect.h);
  for (let x = rect.x + 8; x < rect.x + rect.w; x += 16) fillRect(ctx, CYAN, 0.08, x, rect.y + 30, 1, rect.h - 34);
  for (let y = rect.y + 34; y < rect.y + rect.h; y += 16) fillRect(ctx, CYAN, 0.08, rect.x + 2, y, rect.w - 4, 1);
  strokeRect(ctx, CYAN, 0.7, rect.x, rect.y, rect.w, rect.h);
  fillRect(ctx, CYAN, 0.12, rect.x + 2, rect.y + 2, rect.w - 4, 23);
  drawText(ctx, 'Área de descanso', rect.x + 12, rect.y + 14, 10);

  const tableX = rect.x + rect.w / 2 - 82;
  const tableY = rect.y + 72;
  fillRect(ctx, CYAN, 0.18, tableX, tableY, 164, 52);
  strokeRect(ctx, CYAN, 0.9, tableX, tableY, 164, 52);
  fillRect(ctx, CYAN, 0.85, tableX + 80, tableY, 3, 52);
  fillRect(ctx, CYAN, 0.55, tableX + 12, tableY + 9, 52, 2);
  fillRect(ctx, CYAN, 0.55, tableX + 100, tableY + 38, 52, 2);
  fillRect(ctx, CYAN, 0.55, rect.x + 80, rect.y + 92, 82, 16);
  strokeRect(ctx, CYAN, 0.75, rect.x + 80, rect.y + 92, 82, 16);
  fillRect(ctx, CYAN, 0.55, rect.x + rect.w - 162, rect.y + 92, 82, 16);
  strokeRect(ctx, CYAN, 0.75, rect.x + rect.w - 162, rect.y + 92, 82, 16);
}

function drawPixelAgent(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  mode: AgentMode,
  label: string,
  agentId: OfficeAgentId,
  roomId: string,
  selected: boolean,
  time: number,
): HitBox {
  const frame = Math.floor(time / (mode === 'walking' ? 120 : mode === 'pingpong' ? 190 : 420)) % 2;
  const bob = mode === 'idle' ? Math.round(Math.sin(time / 440)) : mode === 'working' ? (frame ? 1 : 0) : 0;
  const left = Math.round(x - 12);
  const top = Math.round(feetY - 38 + bob);
  if (selected) strokeRect(ctx, CYAN, 0.8, left - 5, top - 4, 34, 46);
  if (mode === 'alert' && Math.sin(time / 100) > 0) strokeRect(ctx, CYAN, 1, left - 5, top - 4, 34, 46);

  fillRect(ctx, CYAN, 0.9, left + 6, top + 1, 12, 12);
  fillRect(ctx, NAVY, 1, left + 6, top + 1, 12, 4);
  fillRect(ctx, NAVY, 1, left + 8, top + 8, 2, 2);
  fillRect(ctx, NAVY, 1, left + 14, top + 8, 2, 2);
  fillRect(ctx, CYAN, 0.9, left + 4, top + 14, 16, 13);
  fillRect(ctx, NAVY, 1, left + 7, top + 16, 10, 8);

  const armLift = mode === 'pingpong' ? (frame ? -5 : 0) : mode === 'alert' ? -5 : mode === 'working' ? 2 : 0;
  fillRect(ctx, CYAN, 0.95, left + 1, top + 16 + armLift, 4, 10);
  fillRect(ctx, CYAN, 0.95, left + 19, top + 16 + (mode === 'walking' && frame ? -2 : -armLift), 4, 10);

  const legOffset = mode === 'walking' && frame ? 3 : mode === 'pingpong' && frame ? 2 : 0;
  fillRect(ctx, NAVY, 1, left + 6 - legOffset, top + 27, 5, 9);
  fillRect(ctx, NAVY, 1, left + 13 + legOffset, top + 27, 5, 9);
  fillRect(ctx, CYAN, 0.95, left + 5 - legOffset, top + 34, 7, 3);
  fillRect(ctx, CYAN, 0.95, left + 12 + legOffset, top + 34, 7, 3);

  if (mode === 'working') {
    fillRect(ctx, CYAN, 0.9, left + 9, top + 20, 6, 2);
  } else if (mode === 'pingpong') {
    fillRect(ctx, CYAN, 0.95, left + (frame ? 19 : -1), top + 18, 4, 8);
  } else if (mode === 'alert') {
    drawText(ctx, '!', left + 24, top + 2, 12);
  }

  drawText(ctx, label, left - 7, top + 47, 8);
  return { x: left - 5, y: top - 4, w: 34, h: 54, agentId, roomId };
}

function traceKey(event?: OfficePixelEvent): string {
  return event ? `${event.runId}:${event.timestamp}:${event.type}:${event.room}:${event.status}` : '';
}

export default function OfficePixelCanvas({
  rooms,
  agentLabels,
  events,
  selectedAgentId,
  onAgentSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitBoxes = useRef<HitBox[]>([]);
  const lastWalkKey = useRef('');
  const latestEvent = events[events.length - 1];
  const [walk, setWalk] = useState<Walk | null>(null);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== 'room.transition') {
      setWalk(null);
      return;
    }
    const key = traceKey(latestEvent);
    if (lastWalkKey.current === key) return;
    lastWalkKey.current = key;
    const agentId = TRACE_AGENT[latestEvent.room];
    if (!agentId) return;
    setWalk({ key, agentId, startedAt: performance.now() });
    const timeout = window.setTimeout(() => {
      setWalk(current => current?.key === key ? null : current);
    }, 720);
    return () => window.clearTimeout(timeout);
  }, [latestEvent?.runId, latestEvent?.timestamp, latestEvent?.type, latestEvent?.room]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId = 0;

    const draw = (time: number) => {
      fillRect(ctx, NAVY, 1, 0, 0, WIDTH, HEIGHT);
      const currentAgent = activeAgentFor(latestEvent);
      const active = Boolean(latestEvent && (
        ['chat.started', 'seed.started', 'room.transition', 'chat.failed', 'seed.failed'].includes(latestEvent.type)
        || (latestEvent.type === 'seed.completed' && isAlert(latestEvent.status))
      ));
      const alert = Boolean(latestEvent && isAlert(latestEvent.status));
      const activeRoom = currentAgent ? HOME_ROOM[currentAgent] : '';

      for (const room of rooms) {
        drawRoom(ctx, room, activeRoom === room.id && active);
      }
      drawLounge(ctx);

      const boxes: HitBox[] = [];
      const walkProgress = walk ? Math.min(1, Math.max(0, (time - walk.startedAt) / 650)) : 1;
      const addAgent = (agentId: OfficeAgentId, roomId: string, defaultX: number, defaultY: number, mode: AgentMode, from?: { x: number; y: number }) => {
        let x = defaultX;
        let y = defaultY;
        let visibleMode = mode;
        if (walk?.agentId === agentId && walkProgress < 1) {
          const roomRect = ROOM_RECTS[roomId];
          const targetX = defaultX;
          const targetY = defaultY;
          const start = from || { x: targetX, y: roomRect.y + roomRect.h - 24 };
          const eased = walkProgress * walkProgress * (3 - 2 * walkProgress);
          x = start.x + (targetX - start.x) * eased;
          y = start.y + (targetY - start.y) * eased;
          visibleMode = 'walking';
        }
        const hit = drawPixelAgent(
          ctx,
          x,
          y,
          visibleMode,
          agentLabels[agentId],
          agentId,
          roomId,
          selectedAgentId === agentId,
          time,
        );
        boxes.push(hit);
      };

      for (const room of rooms) {
        const rect = ROOM_RECTS[room.id];
        if (!rect) continue;
        const homeAgents = room.agents.filter(agent => !PINGPONG_AGENTS.includes(agent) || currentAgent === agent);
        const spacing = 52;
        const startX = rect.x + rect.w / 2 - ((homeAgents.length - 1) * spacing) / 2;
        homeAgents.forEach((agentId, index) => {
          const isCurrent = active && currentAgent === agentId;
          const mode: AgentMode = isCurrent
            ? alert ? 'alert' : 'working'
            : 'idle';
          const loungeStart = PINGPONG_AGENTS.includes(agentId)
            ? { x: agentId === 'personas' ? WIDTH / 2 - 116 : WIDTH / 2 + 116, y: 514 }
            : undefined;
          addAgent(agentId, room.id, startX + index * spacing, rect.y + 124, mode, loungeStart);
        });
      }

      for (let i = 0; i < PINGPONG_AGENTS.length; i++) {
        const agentId = PINGPONG_AGENTS[i];
        if (active && currentAgent === agentId) continue;
        const x = WIDTH / 2 + (i === 0 ? -116 : 116);
        const y = 514;
        const hit = drawPixelAgent(ctx, x, y, 'pingpong', agentLabels[agentId], agentId, HOME_ROOM[agentId], selectedAgentId === agentId, time);
        boxes.push(hit);
      }
      const ballX = WIDTH / 2 + Math.sin(time / 160) * 58;
      const ballY = 438 + Math.abs(Math.sin(time / 160)) * 18;
      fillRect(ctx, CYAN, 1, ballX, ballY, 4, 4);
      hitBoxes.current = boxes;
      if (!reducedMotion) frameId = window.requestAnimationFrame(draw);
    };

    draw(performance.now());
    return () => window.cancelAnimationFrame(frameId);
  }, [rooms, agentLabels, events, latestEvent, selectedAgentId, walk]);

  function selectAtPoint(clientX: number, clientY: number): void {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (clientX - bounds.left) * WIDTH / bounds.width;
    const y = (clientY - bounds.top) * HEIGHT / bounds.height;
    const hit = [...hitBoxes.current].reverse().find(box =>
      x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h,
    );
    if (hit) onAgentSelect(hit.agentId, hit.roomId);
  }

  return <div className="office-pixel-scene">
    <canvas
      ref={canvasRef}
      className="office-pixel-scene__canvas"
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
      onClick={event => selectAtPoint(event.clientX, event.clientY)}
    />
    <div className="office-pixel-scene__agent-list" role="group" aria-label="Selecionar um agente no mapa">
      {rooms.flatMap(room => room.agents.map(agentId => <button
        key={agentId}
        type="button"
        aria-pressed={selectedAgentId === agentId}
        onClick={() => onAgentSelect(agentId, room.id)}
      >
        {agentLabels[agentId]} · {room.title}
      </button>))}
    </div>
  </div>;
}
