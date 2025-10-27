import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Trash2, Plus, Users } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'user' as const });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch users');

      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du chargement' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Email et mot de passe requis' });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setMessage({ type: 'success', text: 'Utilisateur créé' });
      setFormData({ email: '', password: '', role: 'user' });
      setShowForm(false);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: String(error) });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Êtes-vous sûr ?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Erreur de suppression');

      setMessage({ type: 'success', text: 'Utilisateur supprimé' });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur' });
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Gestion des utilisateurs</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Créez et gérez les comptes administrateur et utilisateur
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-primary" />
          <span className="text-xl font-semibold">{users.length} utilisateur(s)</span>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} /> Créer utilisateur
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouvel utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Min 6 caractères</p>
              </div>

              <div>
                <label className="text-sm font-medium">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Créer</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Aucun utilisateur
            </CardContent>
          </Card>
        ) : (
          users.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-semibold">{u.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Rôle: {u.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé: {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {u.id !== user?.id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(u.id)}
                      className="gap-2"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
