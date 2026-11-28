export const officeAgents = [
  { id: 'coordinator', idle: '/office/agents/coordinator-idle.webp', active: '/office/agents/coordinator-active.mp4' },
  { id: 'security', idle: '/office/agents/security-idle.webp', active: '/office/agents/security-active.mp4' },
  { id: 'supervisor', idle: '/office/agents/supervisor-idle.webp', active: '/office/agents/supervisor-active.mp4' },
  { id: 'customer', idle: '/office/agents/customer-idle.webp', active: '/office/agents/customer-active.mp4' },
  { id: 'professor', idle: '/office/agents/professor-idle.webp', active: '/office/agents/professor-active.mp4' },
  { id: 'personas', idle: '/office/agents/personas-idle.webp', active: '/office/agents/personas-active.mp4' },
  { id: 'bugger', idle: '/office/agents/bugger-idle.webp', active: '/office/agents/bugger-active.mp4' },
] as const;

export type OfficeAgentId = typeof officeAgents[number]['id'];
export type OfficeWing = 'ala1' | 'ala2';
export type AvailableOfficeAssets = {
  agents: Partial<Record<OfficeAgentId, { idle?: string; active?: string }>>;
  rooms: Partial<Record<OfficeWing, string>>;
};

const officeRoomPaths: Record<OfficeWing, string> = {
  ala1: '/office/rooms/ala1-bg.webp',
  ala2: '/office/rooms/ala2-bg.webp',
};

async function findOptionalAsset(path: string): Promise<string | undefined> {
  const response = await fetch(path, { method: 'HEAD' });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Falha ao verificar asset opcional (${response.status}).`);
  return path;
}

export async function discoverOfficeAssets(): Promise<AvailableOfficeAssets> {
  const agentAssets = await Promise.all(officeAgents.map(async agent => ({
    id: agent.id,
    idle: await findOptionalAsset(agent.idle),
    active: await findOptionalAsset(agent.active),
  })));
  const roomAssets = await Promise.all(
    (Object.entries(officeRoomPaths) as [OfficeWing, string][]).map(async ([wing, path]) => ({
      wing,
      path: await findOptionalAsset(path),
    })),
  );
  const agents: AvailableOfficeAssets['agents'] = {};
  const rooms: AvailableOfficeAssets['rooms'] = {};

  for (const asset of agentAssets) {
    if (asset.idle || asset.active) agents[asset.id] = { idle: asset.idle, active: asset.active };
  }
  for (const asset of roomAssets) {
    if (asset.path) rooms[asset.wing] = asset.path;
  }

  return { agents, rooms };
}
