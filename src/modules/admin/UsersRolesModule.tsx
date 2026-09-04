import React, { useState, useRef, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { ApiService } from '../../services/api';
import { PERMISSIONS_MATRIX, MODULE_ACTIONS_MATRIX, hasPermission } from '../../core/permissions';
import { User, Role, DelegationRule, PermissionAction } from '../../types';
import {
  Users, UserCheck, ShieldCheck, Lock, Building2, Layers, Plus, Edit3, Trash2, CheckCircle2,
  AlertCircle, Search, Filter, Key, Check, X, ShieldAlert, ArrowRight, Camera, Eye, EyeOff,
  RefreshCw, Phone, Hash, Shield, Mail, FileText, Calendar, UserX, UserPlus, UserCheck2, Clock,
  ArrowLeft, Save, Sliders, Download, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const UsersRolesModule: React.FC = () => {
  const { users, currentUser, setCurrentUser, projects, addAuditLog, addUser, updateUser, deleteUser } = useAppState();

  // ÉTAT DE NAVIGATION DE LA PAGE : 'list' (Vue Annuaire) ou 'create_form' (Pleine Page Nouveau Formulaire)
  const [viewMode, setViewMode] = useState<'list' | 'create_form'>('list');

  // ONGLETS GOUVERNANCE RBAC
  const [activeGovernanceTab, setActiveGovernanceTab] = useState<'annuaire' | 'matrice' | 'seuils'>('annuaire');

  // SEUILS PARAMÉTRIQUES DE VALIDATION FINANCIÈRE DA & BUDGET
  const [daThresholds, setDaThresholds] = useState([
    { id: 'th-1', label: 'Niveau 1 — Saisie Terrain & Petit Matériel', min: 0, max: 500000, roles: ['Chef de Chantier', 'Conducteur de Travaux'] },
    { id: 'th-2', label: 'Niveau 2 — Approbation Directeur de Projet', min: 500000, max: 5000000, roles: ['Directeur Projet'] },
    { id: 'th-3', label: 'Niveau 3 — Approbation Direction Technique & DAF', min: 5000000, max: 25000000, roles: ['Directeur Technique', 'DAF'] },
    { id: 'th-4', label: 'Niveau 4 — Arbitrage Direction Générale (DG / CEO)', min: 25000000, max: 1000000000, roles: ['Direction Générale', 'Super Admin'] },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TOUS');
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);

  React.useEffect(() => {
    if (users.length > 0 && (!selectedUser || !users.some(u => u.id === selectedUser.id))) {
      setSelectedUser(users[0]);
    }
  }, [users]);
  
  // MODALS DE GOUVERNANCE & ÉDITION COMPTE
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);

  // FORMULAIRE ÉDITION DU COMPTE UTILISATEUR
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeCode, setEditEmployeeCode] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('Gebat@2026!');
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);

  // FORMULAIRE COMPLET NOUVEL UTILISATEUR (PLEINE PAGE)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+225 ');
  const [newUserEmployeeCode, setNewUserEmployeeCode] = useState(`EMP-2026-${String(users.length + 1).padStart(3, '0')}`);
  const [newUserRole, setNewUserRole] = useState<Role>('Conducteur de Travaux');
  const [newUserCompany, setNewUserCompany] = useState('GEBAT SA');
  const [newUserProjectId, setNewUserProjectId] = useState(projects[0]?.id || 'CIV-2026-ASS-001');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('Gebat@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  // FORMULAIRE MODIFICATION RÔLE & PÉRIMÈTRE
  const [editRole, setEditRole] = useState<Role>('Conducteur de Travaux');
  const [editCompany, setEditCompany] = useState('GEBAT SA');
  const [editProjectId, setEditProjectId] = useState('GLOBAL');

  // FORMULAIRE DÉLÉGATION DE POUVOIR TEMPORAIRE (ERP MODULE)
  const [delegateUserId, setDelegateUserId] = useState<string>('');
  const [delegationStartDate, setDelegationStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [delegationEndDate, setDelegationEndDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [delegationReason, setDelegationReason] = useState<string>('Congés payés / Mission terrain');

  // SUPPRESSION & REAFFECTATION
  const [reassignUserId, setReassignUserId] = useState<string>('');

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Génération automatique d'un mot de passe fort
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let pass = 'Gebat@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDefaultPassword(pass);
  };

  // Chargement de la photo de profil
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Soumission et enregistrement du nouvel utilisateur (depuis la pleine page)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const avatarInitials = newUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';

    try {
      const res = await ApiService.createUser({
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        employeeCode: newUserEmployeeCode,
        role: newUserRole,
        company: newUserCompany,
        password: defaultPassword,
      });

      const createdUser: User = res.user || {
        id: `USR-${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        employeeCode: newUserEmployeeCode,
        role: newUserRole,
        company: newUserCompany,
        avatar: avatarInitials,
        photoUrl: photoPreview || undefined,
        mustChangePassword,
        status: 'ACTIF',
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (addUser) {
        addUser(createdUser);
      }

      addAuditLog(
        'CREATION_UTILISATEUR',
        'ADMINISTRATION',
        createdUser.email,
        `Utilisateur ${newUserName} [${newUserEmployeeCode}] créé dans MySQL (${newUserRole}).`
      );

      alert(`✅ Utilisateur [${newUserName}] enregistré avec succès dans la base de données MySQL !\nMatricule : ${newUserEmployeeCode}\nRôle : ${newUserRole}\nMot de passe par défaut : ${defaultPassword}`);
      
      setSelectedUser(createdUser);
      setViewMode('list'); // Retour automatique à l'annuaire
      
      // Réinitialisation du formulaire
      setNewUserName('');
      setNewUserEmail('');
      setPhotoPreview(null);
      setNewUserEmployeeCode(`EMP-2026-${String(users.length + 2).padStart(3, '0')}`);
    } catch (err: any) {
      alert(`⚠️ Erreur lors de la création dans la base de données : ${err.message || 'Impossible de créer l\'utilisateur.'}`);
    }
  };

  // Basculer l'état Actif / Inactif
  const handleToggleUserStatus = (u: User) => {
    const newStatus = u.status === 'INACTIF' ? 'ACTIF' : 'INACTIF';
    const updated: User = { ...u, status: newStatus };
    if (updateUser) updateUser(updated);
    if (selectedUser?.id === u.id) setSelectedUser(updated);

    addAuditLog(
      'STATUT_UTILISATEUR',
      'ADMINISTRATION',
      u.email,
      `Statut du compte utilisateur ${u.name} modifié vers ${newStatus}.`
    );
    alert(`⚡ Statut du compte [${u.name}] mis à jour : ${newStatus}`);
  };

  // Ouvrir le formulaire de modification complète des informations du compte
  const handleOpenEditAccountModal = (u: User) => {
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '+225 ');
    setEditEmployeeCode(u.employeeCode || `EMP-2026-001`);
    setEditRole(u.role);
    setEditCompany(u.company || 'GEBAT SA');
    setEditProjectId(u.projectIds?.[0] || 'GLOBAL');
    setEditPhotoUrl(u.photoUrl || null);
    setEditPassword(u.defaultPassword || 'Gebat@2026!');
    setEditMustChangePassword(u.mustChangePassword || false);
    setShowEditAccountModal(true);
  };

  // Sauvegarder la modification complète des informations du compte
  const handleSaveAccountEdits = () => {
    if (!selectedUser) return;
    const updatedUser: User = {
      ...selectedUser,
      name: editName,
      email: editEmail,
      phone: editPhone,
      employeeCode: editEmployeeCode,
      role: editRole,
      company: editCompany,
      projectIds: editProjectId === 'GLOBAL' ? undefined : [editProjectId],
      photoUrl: editPhotoUrl || selectedUser.photoUrl,
      defaultPassword: editPassword,
      mustChangePassword: editMustChangePassword
    };

    if (updateUser) updateUser(updatedUser);
    setSelectedUser(updatedUser);

    addAuditLog(
      'MODIFICATION_COMPTE_UTILISATEUR',
      'ADMINISTRATION',
      updatedUser.email,
      `Modifications appliquées sur les informations du compte de ${updatedUser.name}`
    );

    alert(`✅ Les informations du compte [${updatedUser.name}] ont été mises à jour avec succès !`);
    setShowEditAccountModal(false);
  };

  // Enregistrer modification rôle et périmètre
  const handleSaveRoleAndScope = () => {
    if (!selectedUser) return;
    const updated: User = {
      ...selectedUser,
      role: editRole,
      company: editCompany,
      projectIds: editProjectId === 'GLOBAL' ? undefined : [editProjectId]
    };
    if (updateUser) updateUser(updated);
    setSelectedUser(updated);
    setShowEditRoleModal(false);
    alert(`✅ Rôle et périmètre d'accès de [${selectedUser.name}] mis à jour vers ${editRole} (${editCompany}) !`);
  };

  // Activer une délégation temporaire de pouvoir
  const handleSaveDelegation = () => {
    if (!selectedUser || !delegateUserId) return;
    const delegate = users.find(u => u.id === delegateUserId);
    if (!delegate) return;

    const delegationRule: DelegationRule = {
      delegateUserId: delegate.id,
      delegateUserName: delegate.name,
      startDate: delegationStartDate,
      endDate: delegationEndDate,
      reason: delegationReason,
      isActive: true
    };

    const updated: User = {
      ...selectedUser,
      delegation: delegationRule
    };

    if (updateUser) updateUser(updated);
    setSelectedUser(updated);
    setShowDelegationModal(false);

    addAuditLog(
      'DELEGATION_POUVOIRS',
      'ADMINISTRATION',
      selectedUser.email,
      `Délégation temporaire de pouvoirs accordée à ${delegate.name} du ${delegationStartDate} au ${delegationEndDate}. Motif: ${delegationReason}`
    );

    alert(`✅ Délégation de pouvoir activée avec succès !\nPériode : Du ${delegationStartDate} au ${delegationEndDate}\nDélégué / Intérimaire : ${delegate.name}\nToutes les validations du workflow seront transmises à ${delegate.name}.`);
  };

  // Révoquer une délégation de pouvoir
  const handleRevokeDelegation = () => {
    if (!selectedUser) return;
    const updated: User = {
      ...selectedUser,
      delegation: undefined
    };
    if (updateUser) updateUser(updated);
    setSelectedUser(updated);
    alert(`🛑 Délégation de pouvoir de [${selectedUser.name}] révoquée.`);
  };

  // Supprimer un utilisateur avec option de réaffectation
  const handleConfirmDeleteUser = () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) {
      alert("❌ Impossible de supprimer la session utilisateur actuellement active ! Switcher de session au préalable.");
      return;
    }

    const reassignName = users.find(u => u.id === reassignUserId)?.name || 'Aucun (Archivage direct)';
    deleteUser(selectedUser.id);

    addAuditLog(
      'SUPPRESSION_UTILISATEUR',
      'ADMINISTRATION',
      selectedUser.email,
      `Utilisateur ${selectedUser.name} supprimé. Tâches réaffectées à ${reassignName}.`
    );

    alert(`🗑️ Utilisateur [${selectedUser.name}] supprimé.\nTâches réaffectées à : ${reassignName}`);
    setShowDeleteModal(false);
    setSelectedUser(users.find(u => u.id !== selectedUser.id) || null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === 'TOUS' || u.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRoleFilter]);

  // Export Annuaire Excel .xlsx
  const handleExportXLSX = () => {
    const exportData = filteredUsers.map((u, idx) => ({
      'Matricule': u.employeeCode || `EMP-2026-${String(idx + 1).padStart(3, '0')}`,
      'Nom & Prénoms': u.name,
      'Email Professionnel': u.email,
      'Téléphone': u.phone || '-',
      'Rôle / Fonction': u.role,
      'Société': u.company || 'GEBAT SA',
      'Périmètre Projet': u.assignedProject || 'GLOBAL',
      'Statut': u.status || 'ACTIF',
      'Délégation Active': u.delegation?.isActive ? `Oui (Intérimaire: ${u.delegation.delegateUserName})` : 'Non'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Annuaire_Utilisateurs');

    worksheet['!cols'] = [
      { wch: 16 }, { wch: 25 }, { wch: 30 }, { wch: 18 },
      { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 30 }
    ];

    XLSX.writeFile(workbook, `GEBAT_Annuaire_Utilisateurs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Annuaire CSV .csv
  const handleExportCSV = () => {
    const headers = ['Matricule', 'Nom', 'Email', 'Telephone', 'Role', 'Societe', 'Projet', 'Statut', 'Delegation'];
    const rows = filteredUsers.map((u, idx) => [
      u.employeeCode || `EMP-2026-${String(idx + 1).padStart(3, '0')}`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${u.role.replace(/"/g, '""')}"`,
      `"${(u.company || 'GEBAT SA').replace(/"/g, '""')}"`,
      `"${(u.assignedProject || 'GLOBAL').replace(/"/g, '""')}"`,
      u.status || 'ACTIF',
      u.delegation?.isActive ? `"${u.delegation.delegateUserName}"` : 'Non'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEBAT_Annuaire_Utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RENDER DÉDIÉ : MODE PLEINE PAGE POUR LE FORMULAIRE D'ENREGISTREMENT UTILISATEUR
  if (viewMode === 'create_form') {
    return (
      <div className="space-y-6 text-slate-800 font-sans w-full text-xs animate-in fade-in duration-200">

        {/* TOP BAR / HEADER PAGE FORMULAIRE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-xs"
            >
              <ArrowLeft size={16} /> Retour à l'Annuaire
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Formulaire d'Enregistrement Utilisateur & Habilitation</h1>
                <span className="bg-blue-50 text-blue-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                  PAGE OFFICIELLE ERP
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">Administration ➔ Utilisateurs ➔ Création de compte, Photo de profil, Sécurité & Périmètre Société/Projet</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateUser}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Save size={16} /> Enregistrer & Générer le Compte
            </button>
          </div>
        </div>

        {/* GRILLE DU FORMULAIRE PLEINE PAGE */}
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* COLONNE GAUCHE (8 COLONNES) : SECTIONS DU FORMULAIRE */}
          <div className="lg:col-span-8 space-y-6">

            {/* SECTION 1 : PHOTO DE PROFIL & IDENTITÉ PERSONNELLE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b pb-3">
                <Users size={16} className="text-blue-600" /> 1. Photo de Profil & Identité Personnelle
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="relative group shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Aperçu" className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-600 shadow-md" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-blue-800 text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-blue-300">
                      {newUserName ? newUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PHOTO'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-md cursor-pointer transition"
                    title="Changer la photo"
                  >
                    <Camera size={16} />
                  </button>
                  <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="font-extrabold text-slate-900 text-xs block">Photo Officielle du Collaborateur</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Importez une photo d'identité au format JPG ou PNG. Elle sera affichée dans l'annuaire ERP, le centre de validation et les signatures d'audit.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-4 py-2 rounded-xl border border-slate-300 shadow-2xs text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera size={14} className="text-blue-600" /> Télécharger Photo de Profil
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer px-2"
                      >
                        Supprimer Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: KOUAMÉ Jean-Baptiste"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Email professionnel *</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: j.kouame@gebat-sa.com"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Matricule Employé ERP</label>
                  <input
                    type="text"
                    value={newUserEmployeeCode}
                    onChange={e => setNewUserEmployeeCode(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Téléphone Pro</label>
                  <input
                    type="text"
                    placeholder="Ex: +225 07 08 09 10 11"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2 : SÉCURITÉ & MOT DE PASSE INITIAL */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b pb-3">
                <Key size={16} className="text-amber-600" /> 2. Sécurité, Mot de Passe Initial & Politiques de Connexion
              </h2>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 mb-1">Mot de Passe par Défaut *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={defaultPassword}
                        onChange={e => setDefaultPassword(e.target.value)}
                        className="w-full p-3 bg-white border border-amber-300 rounded-xl font-mono font-extrabold text-blue-900 text-xs pr-10 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="bg-white hover:bg-amber-100 text-amber-900 font-extrabold py-3 px-4 rounded-xl border border-amber-300 flex items-center justify-center gap-2 text-xs shadow-2xs transition cursor-pointer"
                  >
                    <RefreshCw size={14} /> Générer Mot de Passe Sécurisé
                  </button>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="mustChangePassPageCheck"
                    checked={mustChangePassword}
                    onChange={e => setMustChangePassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="mustChangePassPageCheck" className="font-extrabold text-slate-900 cursor-pointer text-xs">
                    Exiger obligatoirement la modification du mot de passe à la 1ère connexion (Must Change Password)
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 3 : RÔLE & PÉRIMÈTRE ACCÈS SÉCURISÉ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b pb-3">
                <ShieldCheck size={16} className="text-purple-600" /> 3. Rôle Métier & Périmètre d'Imputation (Société ➔ Projet)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Rôle Métier Attribué *</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as Role)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs shadow-2xs focus:outline-none cursor-pointer"
                  >
                    <option value="Directeur Projet">Directeur Projet</option>
                    <option value="Conducteur de Travaux">Conducteur de Travaux</option>
                    <option value="Chef de Chantier">Chef de Chantier</option>
                    <option value="Cost Controller">Cost Controller</option>
                    <option value="Achats">Responsable Achats</option>
                    <option value="Magasinier">Magasinier Chantier</option>
                    <option value="Direction Générale">Direction Générale / CEO</option>
                    <option value="Super Admin">Super Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Société d'Imputation</label>
                  <select
                    value={newUserCompany}
                    onChange={e => setNewUserCompany(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs shadow-2xs focus:outline-none cursor-pointer"
                  >
                    <option value="GEBAT SA">GEBAT SA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Chantier / Projet Rattaché (Périmètre Restreint)</label>
                <select
                  value={newUserProjectId}
                  onChange={e => setNewUserProjectId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs shadow-2xs focus:outline-none cursor-pointer"
                >
                  <option value="GLOBAL">Accès Global (Tous les Chantiers du Groupe)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* COLONNE DROITE (4 COLONNES) : RÉCAPITULATIF EN DIRECT DE LA FICHE D'HABILITATION */}
          <div className="lg:col-span-4 space-y-6">

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b pb-3">
                <FileText size={16} className="text-blue-600" /> Synthèse de la Fiche Habilitée
              </h2>

              <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                {photoPreview ? (
                  <img src={photoPreview} alt="Aperçu" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-600 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-blue-800 text-white font-black text-xl flex items-center justify-center shadow-sm">
                    {newUserName ? newUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
                  </div>
                )}
                <div>
                  <strong className="block text-slate-900 text-sm">{newUserName || 'Nom du Collaborateur'}</strong>
                  <span className="text-[11px] text-blue-700 font-bold block">{newUserRole}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">{newUserEmployeeCode}</span>
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <span className="font-sans font-extrabold text-[10px] text-blue-900 uppercase tracking-wider block">PÉRIMÈTRE ACCORDÉ :</span>
                  <div className="text-slate-800 font-bold">Société : {newUserCompany}</div>
                  <div className="text-purple-800 font-bold">Projet : {newUserProjectId === 'GLOBAL' ? 'Tous Chantiers' : newUserProjectId}</div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <span className="font-sans font-extrabold text-[10px] text-amber-900 uppercase tracking-wider block">SÉCURITÉ INITIALE :</span>
                  <div className="text-blue-900 font-extrabold">Pass: {defaultPassword}</div>
                  <div className="text-emerald-700 font-sans font-bold text-[10px]">✓ Modification 1ère Connexion Exigée</div>
                </div>
              </div>

              <div className="pt-3 border-t flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  <Save size={16} /> Valider & Générer le Compte
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="w-full py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>

          </div>

        </form>

      </div>
    );
  }

  // RENDER DÉDIÉ : VUE ANNUAIRE (LISTE)
  return (
    <div className="space-y-6 text-slate-800 font-sans w-full text-xs">

      {/* HEADER AMÉLIORÉ DE LA GESTION ERP DES UTILISATEURS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Utilisateurs, Rôles, Habilitations & Délégation de Pouvoirs</h1>
            <span className="bg-blue-50 text-blue-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
              ERP GOVERNANCE V3
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">Gérez le cycle de vie des utilisateurs, la désactivation, la modification des rôles et la délégation temporaire de tâches.</p>
        </div>

        {/* SWITCHER DE SESSION INTERACTIF POUR TESTER LES RÔLES */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <UserCheck size={14} className="text-blue-600" /> Session Active :
          </span>
          <select
            value={currentUser.id}
            onChange={e => {
              const u = users.find(usr => usr.id === e.target.value);
              if (u) {
                setCurrentUser(u);
                addAuditLog('CHANGEMENT_SESSION', 'ADMINISTRATION', u.email, `Session utilisateur basculée vers ${u.name} (${u.role}).`);
              }
            }}
            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-3 py-1 rounded-lg shadow-2xs cursor-pointer focus:outline-none"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} — ({u.role})</option>
            ))}
          </select>
        </div>
      </div>

      {/* BARRE DE NAVIGATION ET D'ONGLETS DE GOUVERNANCE */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveGovernanceTab('annuaire')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeGovernanceTab === 'annuaire'
              ? 'bg-[#11192e] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users size={16} /> 📋 Annuaire des Utilisateurs ({users.length})
        </button>

        <button
          onClick={() => setActiveGovernanceTab('matrice')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeGovernanceTab === 'matrice'
              ? 'bg-[#11192e] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldCheck size={16} /> 🛡️ Matrice des Habilitations (7 Actions x 8 Rôles)
        </button>

        <button
          onClick={() => setActiveGovernanceTab('seuils')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeGovernanceTab === 'seuils'
              ? 'bg-[#11192e] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Sliders size={16} /> ⚡ Seuils de Validation & Workflows
        </button>
      </div>

      {/* 2. ONGLET MATRICE DES PERMISSIONS (7 ACTIONS x 8 RÔLES) */}
      {activeGovernanceTab === 'matrice' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" /> Matrice Officielle des Habilitations Métier GEBAT 360°
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cartographie des 7 niveaux d'action (<strong className="text-slate-800 font-bold">VOIR, CRÉER, MODIFIER, SOUMETTRE, VALIDER, REFUSER, ADMINISTRER</strong>) par rôle sur les modules ERP.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#11192e] text-white text-[10.5px] uppercase font-black tracking-wider">
                  <th className="p-3.5 border border-slate-700">Module Fonctionnel ERP</th>
                  {[
                    'Directeur Projet',
                    'Conducteur de Travaux',
                    'Chef de Chantier',
                    'Cost Controller',
                    'Achats',
                    'Magasinier',
                    'Direction Générale',
                    'Super Admin'
                  ].map(roleName => (
                    <th key={roleName} className="p-3.5 border border-slate-700 text-center min-w-[130px]">
                      {roleName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { key: 'dashboard-portfolio', name: 'Portefeuille & Projets 360°' },
                  { key: 'btp-production', name: 'Rapports de Production Terrain' },
                  { key: 'btp-wbs', name: 'Structure WBS Chantier' },
                  { key: 'btp-debourse', name: 'Déboursé Sec & Budget DQE' },
                  { key: 'btp-cost-control', name: 'Cost Control & Forecast/EAC' },
                  { key: 'procurement-da', name: 'Demandes d\'Achat (DA)' },
                  { key: 'stock-list', name: 'Stock Magasin & Imputation WBS' },
                  { key: 'admin-users', name: 'Administration Utilisateurs & Rôles' },
                ].map((mod, idx) => (
                  <tr key={mod.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-3 font-extrabold text-slate-900 border border-slate-200 bg-slate-100/50">
                      {mod.name}
                    </td>
                    {[
                      'Directeur Projet',
                      'Conducteur de Travaux',
                      'Chef de Chantier',
                      'Cost Controller',
                      'Achats',
                      'Magasinier',
                      'Direction Générale',
                      'Super Admin'
                    ].map(r => {
                      const tempUser: User = { id: 'test', name: 'Test', email: '', role: r as Role, avatar: 'T' };
                      const canVoir = hasPermission(tempUser, mod.key, 'VOIR');
                      const canCreer = hasPermission(tempUser, mod.key, 'CRÉER');
                      const canModifier = hasPermission(tempUser, mod.key, 'MODIFIER');
                      const canSoumettre = hasPermission(tempUser, mod.key, 'SOUMETTRE');
                      const canValider = hasPermission(tempUser, mod.key, 'VALIDER');
                      const canRefuser = hasPermission(tempUser, mod.key, 'REFUSER');
                      const canAdmin = hasPermission(tempUser, mod.key, 'ADMINISTRER');

                      return (
                        <td key={r} className="p-2 border border-slate-200 text-center align-top">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {canVoir && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 font-extrabold rounded text-[9px]" title="VOIR">👁️ Voir</span>}
                            {canCreer && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-900 font-extrabold rounded text-[9px]" title="CRÉER">➕ Créer</span>}
                            {canModifier && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded text-[9px]" title="MODIFIER">✏️ Modif</span>}
                            {canSoumettre && <span className="px-1.5 py-0.5 bg-sky-100 text-sky-900 font-extrabold rounded text-[9px]" title="SOUMETTRE">🚀 Soum</span>}
                            {canValider && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold rounded text-[9px]" title="VALIDER">✅ Valid</span>}
                            {canRefuser && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 font-extrabold rounded text-[9px]" title="REFUSER">↩️ Refus</span>}
                            {canAdmin && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 font-extrabold rounded text-[9px]" title="ADMINISTRER">🔒 Admin</span>}
                            {!canVoir && <span className="text-[10px] text-slate-300 font-extrabold">⛔ Interdit</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ONGLET SEUILS DE VALIDATION & WORKFLOWS PARAMÉTRIQUES */}
      {activeGovernanceTab === 'seuils' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Sliders size={18} className="text-amber-600" /> Seuils Paramétriques de Validation Financière
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Règles d'escalade budgétaire pour les Demandes d'Achat (DA) et révisions de Forecast/EAC.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {daThresholds.map((th, index) => (
                <div key={th.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{th.label}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px]">
                      Plafond : {th.max >= 1000000000 ? 'Sans Limite' : `${(th.max / 1000000).toFixed(1)} M FCFA`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Montant Min (FCFA)</label>
                      <input
                        type="number"
                        value={th.min}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setDaThresholds(prev => prev.map(t => t.id === th.id ? { ...t, min: val } : t));
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Montant Max (FCFA)</label>
                      <input
                        type="number"
                        value={th.max}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setDaThresholds(prev => prev.map(t => t.id === th.id ? { ...t, max: val } : t));
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Rôles Habilités pour Approbation</label>
                    <div className="flex flex-wrap gap-1">
                      {th.roles.map(r => (
                        <span key={r} className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold rounded-md text-[10.5px]">
                          ✅ {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. ONGLET ANNUAIRE & LISTE UTILISATEURS */}
      {activeGovernanceTab === 'annuaire' && (
        <>
          {/* BARRE DE FILTRES ET BOUTON BASCULEMENT PLEINE PAGE FORMULAIRE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, email, matricule..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Rôle :</span>
                <select
                  value={selectedRoleFilter}
                  onChange={e => setSelectedRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                >
                  <option value="TOUS">Tous les Rôles ({users.length})</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Direction Générale">Direction Générale</option>
                  <option value="Directeur Projet">Directeur Projet</option>
                  <option value="Conducteur de Travaux">Conducteur de Travaux</option>
                  <option value="Chef de Chantier">Chef de Chantier</option>
                  <option value="Cost Controller">Cost Controller</option>
                  <option value="Achats">Achats</option>
                  <option value="Magasinier">Magasinier</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
                title="Exporter l'annuaire en CSV"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={handleExportXLSX}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Exporter l'annuaire en Excel .xlsx"
              >
                <FileSpreadsheet size={15} /> Excel (.xlsx)
              </button>
              <button
                onClick={() => setViewMode('create_form')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Plus size={16} /> Page Nouvel Utilisateur
              </button>
            </div>
          </div>

      {/* GRILLE CENTRALE DE GESTION : LISTE ET INSPECTEUR PERMISSIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLONNE GAUCHE : TABLEAU DE L'ANNUAIRE DES UTILISATEURS */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Users size={16} className="text-blue-600" /> Annuaire ERP des Utilisateurs ({filteredUsers.length})
              </h2>
              <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Registre des comptes et habilitations de l'entreprise GEBAT SA</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200">
                {users.filter(u => u.status !== 'INACTIF').length} Actifs
              </span>
              <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-lg border border-slate-200">
                {users.length} Total
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold border-b text-[10px] uppercase tracking-wider">
                  <th className="p-3">Utilisateur & Photo</th>
                  <th className="p-3">Matricule NIB</th>
                  <th className="p-3">Rôle & Statut</th>
                  <th className="p-3">Délégation / Pouvoir</th>
                  <th className="p-3 text-center">Actions ERP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u, index) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isInactive = u.status === 'INACTIF';
                  const hasDelegation = u.delegation && u.delegation.isActive;
                  const formattedMatricule = u.employeeCode || `EMP-2026-${String(index + 1).padStart(3, '0')}`;

                  // Style de macaron par Rôle
                  const getRoleBadgeStyle = (role: string) => {
                    switch (role) {
                      case 'Super Admin': return 'bg-purple-100 text-purple-900 border-purple-200';
                      case 'Direction Générale':
                      case 'DAF':
                      case 'Directeur Technique': return 'bg-blue-100 text-blue-900 border-blue-200';
                      case 'Directeur Projet': return 'bg-indigo-100 text-indigo-900 border-indigo-200';
                      case 'Conducteur de Travaux':
                      case 'Chef de Chantier': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
                      case 'Cost Controller': return 'bg-amber-100 text-amber-900 border-amber-200';
                      case 'Achats': return 'bg-sky-100 text-sky-900 border-sky-200';
                      case 'Magasinier': return 'bg-teal-100 text-teal-900 border-teal-200';
                      default: return 'bg-slate-100 text-slate-800 border-slate-200';
                    }
                  };

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/90 border-l-4 border-blue-600' : 'hover:bg-slate-50/80'
                      } ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {u.photoUrl || (u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http') || u.avatar.startsWith('/'))) ? (
                            <img src={u.photoUrl || u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shadow-xs shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {u.avatar || u.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <strong className={`block text-slate-900 text-xs leading-tight font-black ${isInactive ? 'line-through text-slate-400' : ''}`}>
                              {u.name}
                            </strong>
                            <span className="text-[11px] text-slate-400 font-mono font-medium block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-xs">
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block">
                          {formattedMatricule}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`font-black px-2.5 py-0.5 rounded-full text-[10px] border inline-block mb-1 shadow-2xs ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                        {isInactive ? (
                          <span className="bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded text-[9px] uppercase border border-rose-200 block w-max">
                            🔴 Inactif
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[9px] uppercase border border-emerald-200 block w-max">
                            🟢 ACTIF
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {hasDelegation ? (
                          <span className="bg-purple-100 text-purple-900 font-black px-2 py-1 rounded-lg text-[10px] border border-purple-200 block shadow-2xs">
                            ⌛ Délégué à {u.delegation?.delegateUserName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">Titulaire</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            title="Examiner la fiche habilitations"
                          >
                            <Eye size={12} /> Examiner
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                              setEditName(u.name);
                              setEditEmail(u.email);
                              setEditPhone(u.phone || '');
                              setEditEmployeeCode(formattedMatricule);
                              setShowEditAccountModal(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] px-2 py-1 rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                            title="Éditer le compte"
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLONNE DROITE : FICHE ERP & CONTRÔLES DÉLÉGATION / STATUT DE L'UTILISATEUR */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  {selectedUser.photoUrl || (selectedUser.avatar && (selectedUser.avatar.startsWith('data:') || selectedUser.avatar.startsWith('http') || selectedUser.avatar.startsWith('/'))) ? (
                    <img src={selectedUser.photoUrl || selectedUser.avatar} alt={selectedUser.name} className="w-12 h-12 rounded-2xl object-cover border border-blue-200 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-blue-800 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      {selectedUser.avatar}
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">{selectedUser.name}</h2>
                    <span className="text-[11px] text-blue-700 font-bold block">{selectedUser.role}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedUser.employeeCode || 'EMP-2026-001'}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                    selectedUser.status === 'INACTIF' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {selectedUser.status || 'ACTIF'}
                  </span>
                </div>
              </div>

              {/* BARRE D'ACTIONS ERP (HABILITATION, DÉLÉGATION, DÉSACTIVATION, SUPPRESSION) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  COMMANDES D'HABILITATION ET DE GOUVERNANCE ERP :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenEditAccountModal(selectedUser)}
                    className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Edit3 size={15} /> Modifier les Informations du Compte
                  </button>

                  <button
                    onClick={() => {
                      setEditRole(selectedUser.role);
                      setEditCompany(selectedUser.company || 'GEBAT SA');
                      setEditProjectId(selectedUser.projectIds?.[0] || 'GLOBAL');
                      setShowEditRoleModal(true);
                    }}
                    className="bg-white hover:bg-blue-50 text-blue-800 font-extrabold p-2 rounded-xl border border-blue-200 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer text-[11px]"
                  >
                    <ShieldCheck size={14} /> Modifier Rôle/Périmètre
                  </button>

                  <button
                    onClick={() => {
                      setDelegateUserId(users.find(u => u.id !== selectedUser.id)?.id || '');
                      setShowDelegationModal(true);
                    }}
                    className="bg-white hover:bg-purple-50 text-purple-800 font-extrabold p-2 rounded-xl border border-purple-200 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer text-[11px]"
                  >
                    <Clock size={14} /> Déléguer Tâches / Intérim
                  </button>

                  <button
                    onClick={() => handleToggleUserStatus(selectedUser)}
                    className={`font-extrabold p-2 rounded-xl border flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer text-[11px] ${
                      selectedUser.status === 'INACTIF'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {selectedUser.status === 'INACTIF' ? <UserCheck size={14} /> : <UserX size={14} />}
                    {selectedUser.status === 'INACTIF' ? 'Réactiver Compte' : 'Désactiver Compte'}
                  </button>

                  <button
                    onClick={() => {
                      setReassignUserId(users.find(u => u.id !== selectedUser.id)?.id || '');
                      setShowDeleteModal(true);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold p-2 rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer text-[11px]"
                  >
                    <Trash2 size={14} /> Supprimer Utilisateur
                  </button>
                </div>
              </div>

              {/* DÉLÉGATION TEMPORAIRE ACTIVE */}
              {selectedUser.delegation && selectedUser.delegation.isActive && (
                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-purple-600" />
                      DÉLÉGATION DE POUVOIRS ACTIVE (INTÉRIM)
                    </span>
                    <button
                      onClick={handleRevokeDelegation}
                      className="text-rose-700 hover:text-rose-900 font-bold text-[10px] cursor-pointer underline"
                    >
                      Révoquer
                    </button>
                  </div>
                  <div className="font-mono text-xs text-purple-950 font-bold space-y-1">
                    <div>Intérimaire / Délégué : <span className="text-blue-900 font-extrabold">{selectedUser.delegation.delegateUserName}</span></div>
                    <div>Période : Du <span className="text-slate-900">{selectedUser.delegation.startDate}</span> au <span className="text-slate-900">{selectedUser.delegation.endDate}</span></div>
                    {selectedUser.delegation.reason && (
                      <div className="text-[10px] text-purple-800 font-sans italic">Motif: {selectedUser.delegation.reason}</div>
                    )}
                  </div>
                </div>
              )}

              {/* PERIMETRE DE PERMISSION (SOCIETE -> PROJET) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  PÉRIMÈTRE D'HABILITATION ACCORDÉ :
                </span>
                <div className="font-mono text-xs text-slate-800 font-bold space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-600" />
                    <span>Société : {selectedUser.company || 'GEBAT SA (Côte d\'Ivoire)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-purple-600" />
                    <span>Projets : {selectedUser.projectIds ? selectedUser.projectIds.join(', ') : 'Tous les chantiers du groupe'}</span>
                  </div>
                </div>
              </div>

              {/* MATRICE D'ACTIONS EXPLICITE (7 ACTIONS) */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider block border-b pb-1 flex justify-between items-center">
                  <span>DROITS SUR LES MODULES (7 ACTIONS)</span>
                  <span className="text-[9px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Rôle : {selectedUser.role}
                  </span>
                </span>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {[
                    { key: 'dashboard-portfolio', label: 'Portefeuille Projets' },
                    { key: 'btp-production', label: 'Rapports de Production' },
                    { key: 'btp-wbs', label: 'Structure WBS' },
                    { key: 'btp-debourse', label: 'Déboursé Sec & Budget' },
                    { key: 'btp-cost-control', label: 'Cost Control & Forecast/EAC' },
                    { key: 'procurement-da', label: 'Demandes d\'Achat (DA)' },
                    { key: 'stock-list', label: 'Stock Magasin & Imputation WBS' },
                    { key: 'admin-users', label: 'Administration Utilisateurs & Rôles' },
                  ].map(mod => {
                    const canVoir = hasPermission(selectedUser, mod.key, 'VOIR');
                    const canCreer = hasPermission(selectedUser, mod.key, 'CRÉER');
                    const canModifier = hasPermission(selectedUser, mod.key, 'MODIFIER');
                    const canSoumettre = hasPermission(selectedUser, mod.key, 'SOUMETTRE');
                    const canValider = hasPermission(selectedUser, mod.key, 'VALIDER');
                    const canRefuser = hasPermission(selectedUser, mod.key, 'REFUSER');
                    const canAdmin = hasPermission(selectedUser, mod.key, 'ADMINISTRER');

                    return (
                      <div key={mod.key} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between font-extrabold text-slate-900 text-xs">
                          <span>{mod.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${canVoir ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                            {canVoir ? 'ACCÈS AUTORISÉ' : 'ACCÈS INTERDIT'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canVoir ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-400'}`}>👁️ VOIR</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canCreer ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-400'}`}>➕ CRÉER</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canModifier ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>✏️ MODIFIER</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canSoumettre ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-400'}`}>🚀 SOUMETTRE</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canValider ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-400'}`}>✅ VALIDER</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canRefuser ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-400'}`}>↩️ REFUSER</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold ${canAdmin ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-400'}`}>🔒 ADMIN</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 font-bold">
              Sélectionnez un utilisateur pour examiner sa fiche ERP.
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* MODAL 0 : MODIFICATION COMPLÈTE DES INFORMATIONS DU COMPTE UTILISATEUR */}
      {showEditAccountModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Modification des Informations du Compte</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedUser.id} — {selectedUser.email}</span>
                </div>
              </div>
              <button onClick={() => setShowEditAccountModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* PHOTO DE PROFIL */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                {editPhotoUrl ? (
                  <img src={editPhotoUrl} alt="Photo" className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-600 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-800 text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {selectedUser.avatar}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700">Photo de Profil Collaborateur</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setEditPhotoUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* IDENTITÉ & CONTACT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Adresse Email Pro *</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Téléphone Professionnel</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Code Matricule ERP</label>
                  <input
                    type="text"
                    value={editEmployeeCode}
                    onChange={e => setEditEmployeeCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* MOT DE PASSE & SÉCURITÉ */}
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block flex items-center gap-1">
                  <Lock size={13} /> Sécurité & Mot de Passe Initial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Mot de Passe par Défaut</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-extrabold text-amber-950">
                      <input
                        type="checkbox"
                        checked={editMustChangePassword}
                        onChange={e => setEditMustChangePassword(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                      />
                      <span>Changement obligatoire à la 1ère connexion</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RÔLE & PÉRIMÈTRE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Rôle Métier *</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as Role)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Directeur Projet">Directeur Projet</option>
                    <option value="Conducteur de Travaux">Conducteur de Travaux</option>
                    <option value="Chef de Chantier">Chef de Chantier</option>
                    <option value="Cost Controller">Cost Controller</option>
                    <option value="Achats">Responsable Achats</option>
                    <option value="Magasinier">Magasinier Chantier</option>
                    <option value="Direction Générale">Direction Générale / CEO</option>
                    <option value="Super Admin">Super Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Société d'Imputation</label>
                  <select
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="GEBAT SA">GEBAT SA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Chantier / Projet</label>
                  <select
                    value={editProjectId}
                    onChange={e => setEditProjectId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="GLOBAL">Accès Global (Tous Projets)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowEditAccountModal(false)} className="px-4 py-2 border rounded-xl font-bold">Annuler</button>
              <button onClick={handleSaveAccountEdits} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1">
                <Save size={15} /> Enregistrer les Modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1 : MODIFICATION DU RÔLE ET DU PÉRIMÈTRE */}
      {showEditRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" /> Modifier Rôle & Habilitations : {selectedUser.name}
              </h3>
              <button onClick={() => setShowEditRoleModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Nouveau Rôle Métier *</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as Role)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                >
                  <option value="Directeur Projet">Directeur Projet</option>
                  <option value="Conducteur de Travaux">Conducteur de Travaux</option>
                  <option value="Chef de Chantier">Chef de Chantier</option>
                  <option value="Cost Controller">Cost Controller</option>
                  <option value="Achats">Responsable Achats</option>
                  <option value="Magasinier">Magasinier Chantier</option>
                  <option value="Direction Générale">Direction Générale / CEO</option>
                  <option value="Super Admin">Super Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Société d'Imputation</label>
                <select
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                >
                  <option value="GEBAT SA">GEBAT SA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Chantier Restreint</label>
                <select
                  value={editProjectId}
                  onChange={e => setEditProjectId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                >
                  <option value="GLOBAL">Accès Global (Tous les Projets)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowEditRoleModal(false)} className="px-4 py-2 border rounded-xl font-bold">Annuler</button>
              <button onClick={handleSaveRoleAndScope} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs">
                Enregistrer la Modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 : DÉLÉGATION DE POUVOIR TEMPORAIRE (ERP INTÉRIM) */}
      {showDelegationModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={18} className="text-purple-600" /> Délégation Temporaire de Pouvoirs : {selectedUser.name}
              </h3>
              <button onClick={() => setShowDelegationModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Transférez la capacité de validation des workflows (DA, BC, Dépassements) à un intendant/délégué pendant votre absence.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Délégué / Intérimaire Désigné *</label>
                <select
                  value={delegateUserId}
                  onChange={e => setDelegateUserId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-300 rounded-xl font-extrabold text-purple-900 cursor-pointer"
                >
                  {users.filter(u => u.id !== selectedUser.id && u.status !== 'INACTIF').map(u => (
                    <option key={u.id} value={u.id}>{u.name} — ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Date Début *</label>
                  <input
                    type="date"
                    value={delegationStartDate}
                    onChange={e => setDelegationStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Date Fin *</label>
                  <input
                    type="date"
                    value={delegationEndDate}
                    onChange={e => setDelegationEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Motif de la Délégation</label>
                <input
                  type="text"
                  placeholder="Ex: Congés payés / Mission terrain Bingerville"
                  value={delegationReason}
                  onChange={e => setDelegationReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowDelegationModal(false)} className="px-4 py-2 border rounded-xl font-bold">Annuler</button>
              <button onClick={handleSaveDelegation} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs">
                Activer la Délégation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 : SUPPRESSION D'UTILISATEUR AVEC RÉAFFECTATION DES TÂCHES */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 text-rose-700 font-extrabold text-sm">
              <h3 className="flex items-center gap-2">
                <Trash2 size={18} /> Confirmation de Suppression Utilisateur
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur <strong>{selectedUser.name}</strong> ({selectedUser.email}) ?
            </p>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
              <label className="block text-[11px] font-extrabold text-amber-900">Réaffecter ses dossiers/tâches en attente à :</label>
              <select
                value={reassignUserId}
                onChange={e => setReassignUserId(e.target.value)}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900"
              >
                {users.filter(u => u.id !== selectedUser.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border rounded-xl font-bold">Annuler</button>
              <button onClick={handleConfirmDeleteUser} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs">
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersRolesModule;
