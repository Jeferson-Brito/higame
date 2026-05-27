import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, EmptyState, StatusDot, ConfirmModal } from '@/components/ui/index'
import type { Season } from '@/types'
import { Calendar, Plus, Edit2, PlayCircle, XCircle, CheckCircle } from 'lucide-react'
import { MONTH_NAMES, SEASON_STATUS_LABEL } from '@/types'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { closeSeasonAndSnapshot } from '@/lib/ranking'

const TOAST_STYLE = { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }

interface SeasonForm {
  name: string
  month: number
  year: number
  description: string
}

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SeasonForm>({ name: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), description: '' })
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState<Season | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => { fetchSeasons() }, [])

  // Auto-fill nome ao mudar mês/ano
  useEffect(() => {
    if (!editingId) {
      setForm(f => ({ ...f, name: `${MONTH_NAMES[f.month]} ${f.year}` }))
    }
  }, [form.month, form.year, editingId])

  async function fetchSeasons() {
    setLoading(true)
    const { data } = await supabase.from('seasons').select('*').is('deleted_at', null).order('year', { ascending: false }).order('month', { ascending: false })
    setSeasons((data ?? []) as Season[])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Nome obrigatório', { style: TOAST_STYLE })
    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('seasons').update({
          name: form.name, month: form.month, year: form.year, description: form.description
        }).eq('id', editingId)
        if (error) throw error
        toast.success('Temporada atualizada!', { style: TOAST_STYLE })
      } else {
        const { error } = await supabase.from('seasons').insert({
          name: form.name, month: form.month, year: form.year, description: form.description, status: 'draft'
        })
        if (error) throw error
        toast.success('Temporada criada!', { style: TOAST_STYLE })
      }
      setShowForm(false)
      setEditingId(null)
      fetchSeasons()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao salvar', { style: TOAST_STYLE })
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(season: Season) {
    try {
      // Desativar qualquer outra temporada ativa
      await supabase.from('seasons').update({ status: 'draft' }).eq('status', 'active')
      await supabase.from('seasons').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', season.id)
      toast.success(`Temporada "${season.name}" ativada!`, { style: TOAST_STYLE })
      fetchSeasons()
    } catch {
      toast.error('Erro ao ativar temporada', { style: TOAST_STYLE })
    }
  }

  async function handleClose(season: Season) {
    setClosing(true)
    try {
      await closeSeasonAndSnapshot(season.id)
      toast.success(`Temporada "${season.name}" encerrada com snapshot gerado!`, { style: TOAST_STYLE })
      setConfirmClose(null)
      fetchSeasons()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao encerrar', { style: TOAST_STYLE })
    } finally {
      setClosing(false)
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'text-higame-warning',
    active: 'text-higame-success',
    closed: 'text-higame-muted',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Temporadas"
        subtitle="Gerencie as temporadas de gamificação"
        action={
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), description: '' }) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova
          </button>
        }
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 w-full" />)}</div>
      ) : seasons.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState icon={<Calendar className="w-6 h-6" />} title="Nenhuma temporada" description="Crie a primeira temporada para começar." />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {seasons.map((season, i) => (
            <motion.div key={season.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-higame-surface2 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-higame-purple" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-outfit font-bold text-higame-text">{season.name}</h3>
                      <div className="flex items-center gap-1">
                        <StatusDot status={season.status as 'active' | 'draft' | 'closed'} />
                        <span className={`text-xs font-inter font-medium ${statusColors[season.status]}`}>
                          {SEASON_STATUS_LABEL[season.status]}
                        </span>
                      </div>
                    </div>
                    {season.description && <p className="text-xs font-inter text-higame-muted mt-0.5">{season.description}</p>}
                    {season.started_at && <p className="text-xs font-inter text-higame-muted mt-0.5">Iniciada em {new Date(season.started_at).toLocaleDateString('pt-BR')}</p>}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {season.status === 'draft' && (
                    <>
                      <button onClick={() => { setForm({ name: season.name, month: season.month, year: season.year, description: season.description ?? '' }); setEditingId(season.id); setShowForm(true) }} className="btn-ghost p-2 rounded-lg" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleActivate(season)} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs">
                        <PlayCircle className="w-3.5 h-3.5" /> Ativar
                      </button>
                    </>
                  )}
                  {season.status === 'active' && (
                    <button onClick={() => setConfirmClose(season)} className="btn-danger flex items-center gap-1.5 px-3 py-2 text-xs">
                      <XCircle className="w-3.5 h-3.5" /> Encerrar
                    </button>
                  )}
                  {season.status === 'closed' && (
                    <span className="flex items-center gap-1 text-xs font-inter text-higame-muted">
                      <CheckCircle className="w-3.5 h-3.5" /> Encerrada
                    </span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-card p-6 w-full max-w-md animate-slide-up space-y-4">
            <h3 className="text-lg font-outfit font-bold text-higame-text">{editingId ? 'Editar Temporada' : 'Nova Temporada'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Mês</label>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} className="input-field">
                  {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Ano</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="input-field">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Descrição (opcional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field resize-none" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmClose}
        title="Encerrar temporada?"
        description={`Esta ação vai gerar snapshot imutável para "${confirmClose?.name}" e bloquear edições. Não pode ser desfeita.`}
        confirmLabel={closing ? 'Encerrando...' : 'Encerrar e Gerar Snapshot'}
        variant="danger"
        onConfirm={() => confirmClose && handleClose(confirmClose)}
        onCancel={() => setConfirmClose(null)}
      />
    </div>
  )
}
