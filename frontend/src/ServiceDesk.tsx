import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, User } from './api';
type Team = { id: string; name: string; members: { accountId: string; role: string; account: { name: string; active: boolean } }[] };
type Account = { id: string; name: string; roles: { role: string }[] };
type Item = { id: string; title: string; status: string; version: number; teamId: string | null; team: { name: string } | null; assigneeId: string | null; requesterId: string; escalationPending: boolean; escalationRole: string | null; escalationDueAt: string | null; registeredStudentId: string | null; entries: { id: string; message: string; createdAt: string; author: { name: string } }[] };
const labels: Record<string,string> = { support: 'Atendente', supervisor: 'Supervisor', coordinator: 'Coordenação', director: 'Direção', admin: 'ADMIN', open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Encerrado' };
export default function ServiceDesk({ user, onDraftChange, onExpired }: { user: User; onDraftChange: (v:boolean)=>void; onExpired: ()=>void }) {
  const [items,setItems]=useState<Item[]>([]), [teams,setTeams]=useState<Team[]>([]), [accounts,setAccounts]=useState<Account[]>([]);
  const [selected,setSelected]=useState(''), [action,setAction]=useState(''), [value,setValue]=useState('coordinator'), [message,setMessage]=useState('');
  const [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false), [revision,setRevision]=useState(0);
  const [requestId,setRequestId]=useState(crypto.randomUUID()), [uncertain,setUncertain]=useState(false);
  const [teamName,setTeamName]=useState(''), [teamId,setTeamId]=useState(''), [accountId,setAccountId]=useState(''), [memberRole,setMemberRole]=useState('support');
  const admin=user.roles.includes('admin'), staff=user.roles.some(r=>['support','supervisor','coordinator','director','admin'].includes(r));
  const ticket=items.find(t=>t.id===selected);
  const operator=admin || (user.roles.includes('support') && ticket?.assigneeId===user.id);
  const decider=!!ticket?.escalationPending && (admin || (!!ticket.escalationRole && user.roles.includes(ticket.escalationRole) && teams.some(t=>t.id===ticket.teamId && t.members.some(m=>m.accountId===user.id && m.role===ticket.escalationRole))));
  const draft=!!message || !!teamName || uncertain;
  useEffect(()=>{onDraftChange(draft);return()=>onDraftChange(false);},[draft,onDraftChange]);
  useEffect(()=>{
    let live=true; setBusy(true);
    Promise.all([api<{items:Item[]}>('/service'),staff?api<Team[]>('/teams'):Promise.resolve([]),admin?api<Account[]>('/teams/accounts'):Promise.resolve([])])
      .then(([queue,groups,people])=>{if(live){setItems(queue.items);setTeams(groups);setAccounts(people);}})
      .catch(e=>{if(live){setError(e.message);if(e instanceof ApiError && e.status===401)onExpired();}}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[revision,staff,admin,onExpired]);
  async function send(event:FormEvent) {
    event.preventDefault();if(!ticket)return;setBusy(true);setError('');
    try {await api(`/service/${ticket.id}`,{method:'POST',body:JSON.stringify({requestId,version:ticket.version,action,value,message})});setMessage('');setUncertain(false);setRequestId(crypto.randomUUID());setNotice('Operação registrada no histórico.');setRevision(n=>n+1);}
    catch(e){setError((e as Error).message);setUncertain(!(e instanceof ApiError));if(e instanceof ApiError && e.status===401)onExpired();}
    finally{setBusy(false);}
  }
  async function manage(path:string,body:object) {
    setBusy(true);setError('');try{await api(path,{method:'POST',body:JSON.stringify(body)});setTeamName('');setNotice('Equipe atualizada.');setRevision(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="connected-card service-desk" aria-labelledby="service-title">
    <div className="connected-heading"><div><p className="eyebrow">SECRETARIA CORTÉX</p><h2 id="service-title">Solicitações e equipes</h2></div><button className="button button--secondary" disabled={busy||draft} onClick={()=>setRevision(n=>n+1)}>Atualizar solicitações</button></div>
    <p>Cadastros, decisões acadêmicas e documentos em um só acompanhamento. Para abrir um pedido ou conversar, use <strong>Atendimento</strong>.</p>
    <p className="connected-note">Encaminhamentos: até 2 dias úteis de demonstração (16 horas úteis, seg–sex 09–17h Bahia, sem feriados). Documentos e decisões nesta versão são registros demonstrativos, sem validade oficial.</p>
    {error&&<p role="alert" className="field__error">{error}</p>}{notice&&<p role="status" className="confirmation">{notice}</p>}
    {busy&&<p role="status">Processando…</p>}
    <div className="field"><label htmlFor="service-ticket">Solicitação (até 100 mais recentes, pendentes primeiro)</label><select id="service-ticket" disabled={busy||draft} value={selected} onChange={e=>{setSelected(e.target.value);setAction('');setValue('');setRequestId(crypto.randomUUID());setNotice('');}}><option value="">Selecione um atendimento</option>{items.map(t=><option key={t.id} value={t.id}>{t.title} · {labels[t.status]}</option>)}</select></div>
    {!busy&&!items.length&&<p>Nenhum atendimento disponível. Abra um chamado na aba Atendimento.</p>}
    {ticket&&<article><h3>{ticket.title}</h3><p>{ticket.team?.name||'Legado sem equipe'} · {labels[ticket.status]}</p><p>Protocolo: <code>{ticket.id}</code></p>
      {ticket.escalationDueAt&&<p><strong>{ticket.escalationPending?'Aguardando decisão':'Decisão registrada'} · {labels[ticket.escalationRole||'']}</strong><br/>Prazo: {new Date(ticket.escalationDueAt).toLocaleString('pt-BR')}{ticket.escalationPending&&new Date(ticket.escalationDueAt)<new Date()?' · Prazo excedido':''}</p>}
      {ticket.registeredStudentId&&<p>Cadastro de aluno registrado. O acesso acadêmico depende da aprovação do vínculo pelo ADMIN.</p>}
      {(operator||decider)&&ticket.status!=='resolved'&&<form onSubmit={send}>
        <div className="field"><label htmlFor="service-action">Operação</label><select id="service-action" disabled={busy||uncertain} value={action} onChange={e=>{setAction(e.target.value);setValue(e.target.value==='decision'?'approve':e.target.value==='escalate'?'coordinator':'');setRequestId(crypto.randomUUID());}}>
          <option value="">Selecione</option>{operator&&!ticket.escalationPending&&<option value="escalate">Encaminhar ao setor responsável</option>}{operator&&!ticket.registeredStudentId&&!ticket.escalationPending&&<option value="registration">Cadastrar aluno para o responsável solicitante</option>}{decider&&<option value="decision">Registrar decisão do setor</option>}{admin&&<option value="transfer">Transferir para outra equipe</option>}
        </select></div>
        <div className="field"><label htmlFor="service-value">{action==='registration'?'Nome completo do aluno':action==='decision'?'Decisão':'Destino'}</label>
          {action==='registration'?<input id="service-value" required minLength={3} maxLength={100} disabled={busy||uncertain} value={value} onChange={e=>setValue(e.target.value)}/>:<select id="service-value" required disabled={busy||uncertain} value={value} onChange={e=>setValue(e.target.value)}><option value="">Selecione</option>{action==='escalate'?['coordinator','director','admin'].map(r=><option key={r} value={r}>{labels[r]}</option>):action==='decision'?<><option value="approve">Aprovar / registrar emissão demonstrativa</option><option value="reject">Indeferir com justificativa</option></>:teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}
        </div>
        <div className="field"><label htmlFor="service-message">Justificativa / conteúdo da decisão</label><textarea id="service-message" required minLength={3} maxLength={1000} rows={4} disabled={busy||uncertain} value={message} onChange={e=>setMessage(e.target.value)}/></div>
        <p>O conteúdo será visível ao solicitante no histórico. Não inclua senhas ou informações de terceiros.</p>
        <div className="communication-actions"><button className="button button--primary" disabled={busy||!action}>{uncertain?'Repetir operação com segurança':'Registrar operação'}</button><button type="button" className="button button--secondary" disabled={busy} onClick={()=>{setMessage('');setUncertain(false);setRequestId(crypto.randomUUID());setRevision(n=>n+1);}}>Descartar e atualizar</button></div>
      </form>}
      <h3>Movimentações da secretaria</h3>{!ticket.entries.length&&<p>Nenhum encaminhamento registrado.</p>}{ticket.entries.map(e=><div className="communication-body" key={e.id}><strong>{e.author.name}</strong> · {new Date(e.createdAt).toLocaleString('pt-BR')}<p style={{whiteSpace:'pre-wrap'}}>{e.message}</p></div>)}
    </article>}
    {staff&&<><h3>Equipes no seu alcance</h3><p>Atendente → supervisor → coordenador → diretor → ADMIN. A consulta depende dos vínculos da conta.</p><div className="service-teams">{teams.map(t=><article key={t.id}><h4>{t.name}</h4><ul>{t.members.map(m=><li key={m.accountId}>{m.account.name} · {labels[m.role]}{!m.account.active?' (inativo)':''}</li>)}</ul></article>)}</div></>}
    {admin&&<details><summary>ADMIN · Gerenciar equipes e vínculos</summary><form onSubmit={e=>{e.preventDefault();void manage('/teams',{name:teamName});}}><div className="field"><label htmlFor="team-name">Nova equipe</label><input id="team-name" minLength={3} maxLength={100} required value={teamName} onChange={e=>setTeamName(e.target.value)}/></div><button className="button button--secondary" disabled={busy}>Criar equipe</button></form>
      <form onSubmit={e=>{e.preventDefault();void manage(`/teams/${teamId}/members`,{accountId,role:memberRole,enabled:true});}}><div className="field"><label htmlFor="team-choice">Equipe</label><select id="team-choice" required value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Selecione</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="field"><label htmlFor="team-account">Funcionário</label><select id="team-account" required value={accountId} onChange={e=>{setAccountId(e.target.value);setMemberRole(accounts.find(a=>a.id===e.target.value)?.roles[0]?.role||'support');}}><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><div className="field"><label htmlFor="team-role">Papel do vínculo</label><select id="team-role" value={memberRole} onChange={e=>setMemberRole(e.target.value)}>{accounts.find(a=>a.id===accountId)?.roles.filter(r=>r.role!=='admin').map(r=><option key={r.role} value={r.role}>{labels[r.role]}</option>)}</select></div><div className="communication-actions"><button className="button button--primary" disabled={busy||!teamId||!accountId}>Salvar vínculo</button><button type="button" className="button button--secondary" disabled={busy||!teamId||!accountId} onClick={()=>void manage(`/teams/${teamId}/members`,{accountId,role:memberRole,enabled:false})}>Remover vínculo</button></div></form>
    </details>}
  </section>;
}
