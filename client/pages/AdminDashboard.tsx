import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Trash2, Plus, Users, Edit2, X, MapPin } from "lucide-react";
import type { Site } from "@shared/api";

interface UserItem {
  id: string;
  email: string;
  role: "admin" | "user";
  permissions: string[];
  primary_site_id?: string | null;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: "manage_doctors", label: "Ajouter des médecins" },
  { id: "view_reports", label: "Afficher les rapports" },
  { id: "manage_users", label: "Gérer les utilisateurs" },
  { id: "access_all_sites", label: "Accès à tous les sites" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user" as const,
    permissions: [] as string[],
    primary_site_id: "",
    accessible_site_ids: [] as string[],
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Erreur lors du chargement des utilisateurs",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.email || (!editingId && !formData.password)) {
      setMessage({ type: "error", text: "Email et mot de passe requis" });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");

      if (editingId) {
        // Update user
        const res = await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: formData.role,
            permissions: formData.permissions,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la modification");
        }

        setMessage({ type: "success", text: "Utilisateur modifié" });
      } else {
        // Create new user
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: formData.role,
            permissions: formData.permissions,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la création");
        }

        setMessage({ type: "success", text: "Utilisateur créé" });
      }

      setFormData({
        email: "",
        password: "",
        role: "user",
        permissions: [],
      });
      setEditingId(null);
      setShowUserForm(false);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: String(error) });
    }
  };

  const handleEditUser = (u: UserItem) => {
    setEditingId(u.id);
    setFormData({
      email: u.email,
      password: "",
      role: u.role,
      permissions: u.permissions || [],
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Erreur de suppression");

      setMessage({ type: "success", text: "Utilisateur supprimé" });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: "Erreur" });
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const closeForm = () => {
    setShowUserForm(false);
    setEditingId(null);
    setFormData({
      email: "",
      password: "",
      role: "user",
      permissions: [],
    });
  };

  const getPermissionLabel = (permissionId: string) => {
    return (
      AVAILABLE_PERMISSIONS.find((p) => p.id === permissionId)?.label ||
      permissionId
    );
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Gestion des utilisateurs
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Créez, modifiez et supprimez les comptes administrateur et utilisateur
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Users Management Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-primary" />
            <span className="text-xl font-semibold">
              {users.length} utilisateur(s)
            </span>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({
                email: "",
                password: "",
                role: "user",
                permissions: [],
              });
              setShowUserForm(true);
            }}
            className="gap-2"
          >
            <Plus size={16} /> Créer utilisateur
          </Button>
        </div>

        {/* User Form Dialog */}
        <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? "Modifier l'utilisateur"
                  : "Créer un nouvel utilisateur"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Modifiez les informations de l'utilisateur"
                  : "Remplissez les informations du nouvel utilisateur"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!!editingId}
                  required
                />
              </div>

              {!editingId && (
                <div>
                  <label className="text-sm font-medium">Mot de passe</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min 6 caractères
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-3">
                  Permissions supplémentaires
                </label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={perm.id}
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-gray-300"
                      />
                      <label
                        htmlFor={perm.id}
                        className="text-sm cursor-pointer"
                      >
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? "Modifier" : "Créer"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Users List */}
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
                      <div className="flex-1">
                        <p className="font-semibold">{u.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Rôle:{" "}
                          {u.role === "admin"
                            ? "Administrateur"
                            : "Utilisateur"}
                        </p>
                        {u.permissions && u.permissions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Permissions:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {u.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                                >
                                  {getPermissionLabel(perm)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Créé:{" "}
                          {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    {u.id !== user?.id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(u)}
                          className="gap-2"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(u.id)}
                          className="gap-2"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
