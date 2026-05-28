import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Users2, Plus, Edit2, Trash2, X, UserCheck, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/index'
import { motion, AnimatePresence } from 'framer-motion'
import type { Team } from '@/types'

interface Employee {
  id: string
  full_name: string
  position: string | null
  team_id: string | null
  avatar_url: string | null
}

const PRESET_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#65A30D',
]

const PRESET_ICONS = ['🏆', '⚡', '🔥', '🌟', '💎', '🎯', '🚀', '🛡️', '⚔️', '🦁', '🐉', '💪']

export default function AdminTeams() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState(PRESET_ICONS[0])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamsRes, empsRes] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('profiles').select('id, full_name, position, team_id, avatar_url').eq('role', 'employee').eq('is_active', true).order('full_name'),
      ])
      setTeams(teamsRes.data as Team[] ?? [])
      setEmployees(empsRes.data as Employee[] ?? [])
    } catch {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setColor(PRESET_COLORS[0])
    setIcon(PRESET_ICONS[0])
  }

  const startEditing = (team: Team) => {
    setEditingId(team.id)
    setName(team.name)
    setDescription(team.description ?? '')
    setColor(team.color)
    setIcon(team.icon)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nome da equipe é obrigatório.')
    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('teams').update({ name, description, color, icon }).eq('id', editingId)
        if (error) throw error
        toast.success('Equipe atualizada!')
      } else {
        const { error } = await supabase.from('teams').insert({ name, description, color, icon })
        if (error) throw error
        toast.success('Equipe criada!')
      }
      resetForm()
      void fetchData()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (team: Team) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', team.id)
      if (error) throw error
      toast.success('Equipe excluída.')
      setConfirmDelete(null)
      void fetchData()
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  const handleAssignTeam = async (employeeId: string, teamId: string | null) => {
    try {
      await supabase.from('profiles').update({ team_id: teamId }).eq('id', employeeId)
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, team_id: teamId } : e))
      toast.success(teamId ? 'Colaborador atribuído!' : 'Colaborador removido da equipe.')
    } catch {
      toast.error('Erro ao atribuir equipe.')
    }
  }

  const teamMembers = (teamId: string) => employees.filter(e => e.team_id === teamId)
  const unassigned = employees.filter(e => !e.team_id)

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Gestão de Equipes"
        subtitle="Crie equipes, personalize a identidade visual e gerencie os membros"
      />

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'teams' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Users2 className="w-5 h-5" /> Equipes
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'members' ? 'bg-higame-neon/20 text-higame-neon border border-higame-neon/30' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <UserCheck className="w-5 h-5" /> Atribuir Membros
        </button>
      </div>

      {activeTab === 'teams' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <GlassCard className="p-6 relative">
            {editingId && (
              <button onClick={resetForm} className="absolute top-6 right-6 text-slate-400 hover:text-white flex items-center gap-1 text-sm bg-slate-800 px-3 py-1.5 rounded-lg">
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-higame-purple" />
              {editingId ? 'Editar Equipe' : 'Nova Equipe'}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome da Equipe</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field w-full" placeholder="Ex: Time Vendas" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field w-full h-20 resize-none" placeholder="Breve descrição da equipe..." />
              </div>

              {/* Ícone */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ícone da Equipe</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic} type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${icon === ic ? 'bg-higame-purple/40 border-2 border-higame-purple scale-110' : 'bg-slate-800 border border-white/10 hover:scale-105'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Cor da Equipe
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                    />
                  ))}
                  <input
                    type="color" value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/20 bg-transparent"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${color}30`, border: `2px solid ${color}60` }}>
                  {icon}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{name || 'Nome da Equipe'}</p>
                  <p className="text-xs" style={{ color }}>{description || 'Sem descrição'}</p>
                </div>
              </div>

              <button disabled={saving} type="submit" className="w-full btn-primary py-3">
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Equipe'}
              </button>
            </form>
          </GlassCard>

          {/* Lista de equipes */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-outfit font-bold text-white mb-6">Equipes ({teams.length})</h2>
            <div className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Nenhuma equipe criada ainda.</p>
              ) : (
                teams.map(team => (
                  <motion.div
                    key={team.id}
                    layout
                    className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${team.color}25`, border: `2px solid ${team.color}50` }}
                      >
                        {team.icon}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{team.name}</p>
                        <p className="text-xs text-slate-400">{teamMembers(team.id).length} membro(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditing(team)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(team)} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      ) : (
        /* Aba de Membros */
        <div className="space-y-6">
          {/* Sem equipe */}
          {unassigned.length > 0 && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-outfit font-bold text-slate-400 mb-4 flex items-center gap-2">
                <span className="text-xl">🚫</span> Sem Equipe ({unassigned.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unassigned.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white">{emp.full_name}</p>
                      <p className="text-xs text-slate-500">{emp.position ?? '—'}</p>
                    </div>
                    <select
                      value=""
                      onChange={e => handleAssignTeam(emp.id, e.target.value || null)}
                      className="input-field text-xs py-1.5 px-2 w-36"
                    >
                      <option value="">Atribuir...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Por equipe */}
          {teams.map(team => {
            const members = teamMembers(team.id)
            return (
              <GlassCard key={team.id} className="p-6" style={{ borderColor: `${team.color}30` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${team.color}25`, border: `2px solid ${team.color}50` }}>
                    {team.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-outfit font-bold text-white">{team.name}</h2>
                    <p className="text-xs" style={{ color: team.color }}>{members.length} membro(s)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.length === 0 ? (
                    <p className="text-slate-500 text-sm col-span-2">Nenhum membro atribuído.</p>
                  ) : (
                    members.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.position ?? '—'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={emp.team_id ?? ''}
                            onChange={e => handleAssignTeam(emp.id, e.target.value || null)}
                            className="input-field text-xs py-1.5 px-2 w-32"
                          >
                            <option value="">Sem equipe</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir Equipe?"
        description={`Tem certeza que deseja excluir "${confirmDelete?.name}"? Os membros serão desassociados mas não serão removidos.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
