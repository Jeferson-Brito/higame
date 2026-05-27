import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, EmptyState, Skeleton, StatusDot, ConfirmModal } from '@/components/ui/index'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'
import { Users, Plus, Edit2, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const TOAST_STYLE = { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }

interface EmployeeForm {
  full_name: string
  email: string
  password: string
  position: string
  team: string
  role: 'admin' | 'employee'
}

const EMPTY_FORM: EmployeeForm = {
  full_name: '', email: '', password: '', position: '', team: '', role: 'employee'
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<Profile | null>(null)

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .order('full_name')
    setEmployees((data ?? []) as Profile[])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.full_name.trim()) return toast.error('Nome obrigatório', { style: TOAST_STYLE })
    setSaving(true)
    try {
      if (editingId) {
        // Editar existente
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name,
          position: form.position,
          team: form.team,
          role: form.role,
        }).eq('id', editingId)
        if (error) throw error
        toast.success('Colaborador atualizado!', { style: TOAST_STYLE })
      } else {
        // Criar novo via Supabase Admin Auth
        if (!form.email || !form.password) return toast.error('Email e senha obrigatórios', { style: TOAST_STYLE })
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.full_name, role: form.role }
          }
        })
        if (authError) throw authError
        if (authData.user) {
          await supabase.from('profiles').update({
            position: form.position,
            team: form.team,
            role: form.role,
          }).eq('id', authData.user.id)
        }
        toast.success('Colaborador criado! Verifique o email.', { style: TOAST_STYLE })
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      fetchEmployees()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao salvar', { style: TOAST_STYLE })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(emp: Profile) {
    const { error } = await supabase.from('profiles')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id)
    if (error) { toast.error('Erro ao alterar status', { style: TOAST_STYLE }); return }
    toast.success(emp.is_active ? 'Colaborador desativado' : 'Colaborador ativado', { style: TOAST_STYLE })
    setConfirmToggle(null)
    fetchEmployees()
  }

  function openEdit(emp: Profile) {
    setForm({
      full_name: emp.full_name,
      email: '',
      password: '',
      position: emp.position ?? '',
      team: emp.team ?? '',
      role: emp.role,
    })
    setEditingId(emp.id)
    setShowForm(true)
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.position ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Colaboradores"
        subtitle={`${employees.filter(e => e.is_active).length} ativos`}
        action={
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-higame-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar colaborador..."
          className="input-field pl-10"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState icon={<Users className="w-6 h-6" />} title="Nenhum colaborador encontrado" />
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className={`p-4 flex items-center gap-4 ${!emp.is_active ? 'opacity-50' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-higame flex items-center justify-center text-sm font-outfit font-bold text-white flex-shrink-0">
                  {getInitials(emp.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-outfit font-semibold text-higame-text">{emp.full_name}</p>
                    <span className={`text-[10px] font-inter px-1.5 py-0.5 rounded-full ${emp.role === 'admin' ? 'bg-higame-purple/20 text-higame-purple' : 'bg-higame-surface3 text-higame-muted'}`}>
                      {emp.role === 'admin' ? 'Admin' : 'Employee'}
                    </span>
                    <StatusDot status={emp.is_active ? 'active' : 'offline'} />
                  </div>
                  <p className="text-xs font-inter text-higame-muted truncate">
                    {[emp.position, emp.team].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(emp)} className="btn-ghost p-2 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmToggle(emp)} className="btn-ghost p-2 rounded-lg">
                    {emp.is_active ? <ToggleRight className="w-5 h-5 text-higame-success" /> : <ToggleLeft className="w-5 h-5 text-higame-muted" />}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-card p-6 w-full max-w-md animate-slide-up space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-outfit font-bold text-higame-text">
              {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h3>
            {['full_name', ...(editingId ? [] : ['email', 'password']), 'position', 'team'].map(field => (
              <div key={field}>
                <label className="input-label capitalize">
                  {field === 'full_name' ? 'Nome Completo' : field === 'position' ? 'Cargo' : field === 'team' ? 'Equipe' : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field as keyof EmployeeForm]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="input-field"
                  placeholder={field === 'full_name' ? 'João Silva' : field === 'email' ? 'joao@empresa.com' : field === 'password' ? 'Min. 6 caracteres' : ''}
                />
              </div>
            ))}
            <div>
              <label className="input-label">Permissão</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'employee' }))} className="input-field">
                <option value="employee">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmToggle}
        title={confirmToggle?.is_active ? 'Desativar colaborador?' : 'Ativar colaborador?'}
        description={`${confirmToggle?.full_name} será ${confirmToggle?.is_active ? 'desativado' : 'ativado'}.`}
        confirmLabel={confirmToggle?.is_active ? 'Desativar' : 'Ativar'}
        variant={confirmToggle?.is_active ? 'danger' : 'primary'}
        onConfirm={() => confirmToggle && handleToggleActive(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  )
}
