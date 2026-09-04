import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { DQEImportModal } from '../../shared/components/DQEImportModal';
import { DQEItem, WBSNode } from '../../types';
import {
  ArrowRight,
  ArrowLeft,
  Info,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  Layers,
  DollarSign,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  Check,
  ChevronDown,
  X,
  Save
} from 'lucide-react';
import { GEBAT_DOMAINS } from '../../types';

interface CreateProjectWizardProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const CreateProjectWizard: React.FC<CreateProjectWizardProps> = ({ onCancel, onSuccess }) => {
  const { createProject, projects, users = [] } = useAppState();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Logo du client (aperçu)
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);

  // Étape 1 — Informations générales (Données Réelles Côte d'Ivoire)
  const [projectCodeNum, setProjectCodeNum] = useState('CIV-2026-ASS-003');
  const [name, setName] = useState('Station de traitement des boues de vidange d’Abidjan Nord (Anyama / Abobo)');
  const [client, setClient] = useState('Ministère de l’Hydraulique & Assainissement / ONEP');
  const [company, setCompany] = useState('GEBAT SA');

  const [country, setCountry] = useState("Côte d'Ivoire");
  const [city, setCity] = useState('Anyama');
  const [region, setRegion] = useState("District Autonome d'Abidjan");

  const [projectType, setProjectType] = useState('Génie Civil');
  const [natureOuvrage, setNatureOuvrage] = useState('Station de Traitement des Boues');
  const [contractCategory, setContractCategory] = useState('Marché de travaux');

  const [contractAmountHT, setContractAmountHT] = useState<number | string>('2850000000');
  const [currency, setCurrency] = useState('FCFA');
  const [exchangeRate, setExchangeRate] = useState<number | string>('1');

  const [startDate, setStartDate] = useState('2026-03-01');
  const [durationMonths, setDurationMonths] = useState<number | string>('18');
  const [endDateContractual, setEndDateContractual] = useState('2027-08-31');
  const [endDateRevised, setEndDateRevised] = useState('2027-09-30');

  const [description, setDescription] = useState(
    "Construction et aménagement des infrastructures de génie civil, réacteurs biologiques, bassins de dépotage et voiries pour la station de traitement des boues de vidange de la zone d'Anyama / Abobo."
  );

  const [manager, setManager] = useState('SEA Alphonse');
  const [costCenterCode, setCostCenterCode] = useState('PRJ-CIV-2026-003');
  const [priority, setPriority] = useState('Élevée');
  const [initialStatus, setInitialStatus] = useState('En préparation');

  // Code projet généré sans préfixe redondant
  const generatedCode = useMemo(() => {
    const trimmed = projectCodeNum.trim();
    if (!trimmed) return 'CIV-2026-ASS-003';
    return trimmed;
  }, [projectCodeNum]);

  // Étape 2 — Contrat
  const [contractRef, setContractRef] = useState('CTR-GEBAT-2026-ASS-003');
  const [advancePct, setAdvancePct] = useState('20');
  const [retentionPct, setRetentionPct] = useState('5');
  const [guaranteeType, setGuaranteeType] = useState('Caution bancaire à première demande (NSIA Banque / BOA)');

  // Étape 3 — Équipe Projet
  const [siteManager, setSiteManager] = useState('KOUASSI Jean');
  const [qseManager, setQseManager] = useState('KOUADIO Marc');
  const [controlOffice, setControlOffice] = useState('SOCOTEC / LBTP');

  // Gestion de l'upload du logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setClientLogoUrl(url);
    }
  };

  const [showDqeImportModal, setShowDqeImportModal] = useState(false);
  const [importedWbsNodes, setImportedWbsNodes] = useState<WBSNode[] | undefined>(undefined);
  const [importedDqeCount, setImportedDqeCount] = useState<number>(0);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      // SOUMISSION FINALE DU PROJET (ÉTAPE 4)
      if (!name.trim()) {
        alert('Veuillez renseigner le nom du projet.');
        setCurrentStep(1);
        return;
      }

      const contractAmt = Number(contractAmountHT) || 0;
      
      // Si un DQE a été importé, calculer le budget DS exact depuis les nœuds WBS
      const importedWbsBudget = importedWbsNodes && importedWbsNodes.length > 0
        ? importedWbsNodes.reduce((sum, n) => sum + Number(n.revisedBudget || n.initialBudget || 0), 0)
        : 0;

      const estimatedBudgetDS = importedWbsBudget > 0 ? importedWbsBudget : Math.round(contractAmt * 0.82);

      const calculatedRisk = 
        priority === 'Critique' ? 'Critique' :
        priority === 'Élevée' ? 'Élevé' : 'Faible';

      createProject({
        code: generatedCode,
        domainCode: 'BAT',
        name: name.trim() || `Projet ${generatedCode}`,
        company: company || 'GEBAT SA',
        client: client.trim() || 'Client Maître d’Ouvrage',
        country: country || "Côte d'Ivoire",
        location: `${city}${region ? `, ${region}` : ''}`,
        activity: natureOuvrage || projectType || 'Génie Civil',
        manager: manager || 'SEA Alphonse',
        contractRef: contractRef || `CTR-${generatedCode}`,
        contractAmount: contractAmt,
        currency: currency || 'FCFA',
        signatureDate: startDate || new Date().toISOString().split('T')[0],
        startDate: startDate || new Date().toISOString().split('T')[0],
        durationMonths: Number(durationMonths) || 18,
        endDate: endDateContractual || '2027-08-31',
        initialBudget: estimatedBudgetDS,
        revisedBudget: estimatedBudgetDS,
        progress: 0,
        status: (initialStatus as any) || 'En préparation',
        risk: calculatedRisk as any,
      }, importedWbsNodes);

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  if (isSuccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-lg mx-auto my-12">
        <CheckCircle2 size={56} className="text-emerald-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-extrabold text-slate-900">Projet {generatedCode} Créé avec Succès !</h2>
        <p className="text-slate-500 text-xs">
          Le projet <strong>{name}</strong> est maintenant enregistré en statut <strong>En préparation</strong> et prêt pour l'élaboration du WBS et du budget DS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-800 w-full font-sans pb-12">
      {/* HEADER DE PAGE & STEPPER EN 4 ÉTAPES (STYLE EXACT MEDIA_1787740011274) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* TITRE PRINCIPAL & SELECTEUR SOCIÉTÉ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">NOUVEAU PROJET</h1>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">Créez un nouveau projet en 4 étapes</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-500">Société :</span>
              <select
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="GEBAT SA">GEBAT SA</option>
                <option value="GEBAT Sénégal">GEBAT Sénégal</option>
                <option value="GEBAT Mali">GEBAT Mali</option>
                <option value="GEBAT Burkina">GEBAT Burkina</option>
              </select>
            </div>
          </div>
        </div>

        {/* STEPPER BAR EN 4 ÉTAPES HORIZONTALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* ÉTAPE 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition relative ${
              currentStep === 1
                ? 'bg-blue-50/60 border-blue-600 border-l-4'
                : currentStep > 1
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                currentStep === 1
                  ? 'bg-blue-600 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              1
            </div>
            <div className="truncate space-y-0.5">
              <div className={`font-black text-[11px] uppercase tracking-wider ${currentStep === 1 ? 'text-blue-900' : 'text-slate-700'}`}>
                INFORMATIONS GÉNÉRALES
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium truncate">Données principales du projet</div>
            </div>
          </div>

          {/* ÉTAPE 2 */}
          <div
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition relative ${
              currentStep === 2
                ? 'bg-blue-50/60 border-blue-600 border-l-4'
                : currentStep > 2
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                currentStep === 2
                  ? 'bg-blue-600 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              2
            </div>
            <div className="truncate space-y-0.5">
              <div className={`font-black text-[11px] uppercase tracking-wider ${currentStep === 2 ? 'text-blue-900' : 'text-slate-700'}`}>
                CONTRAT
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium truncate">Informations contractuelles</div>
            </div>
          </div>

          {/* ÉTAPE 3 */}
          <div
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition relative ${
              currentStep === 3
                ? 'bg-blue-50/60 border-blue-600 border-l-4'
                : currentStep > 3
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                currentStep === 3
                  ? 'bg-blue-600 text-white'
                  : currentStep > 3
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              3
            </div>
            <div className="truncate space-y-0.5">
              <div className={`font-black text-[11px] uppercase tracking-wider ${currentStep === 3 ? 'text-blue-900' : 'text-slate-700'}`}>
                ÉQUIPE PROJET
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium truncate">Responsables et parties prenantes</div>
            </div>
          </div>

          {/* ÉTAPE 4 */}
          <div
            onClick={() => setCurrentStep(4)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition relative ${
              currentStep === 4
                ? 'bg-blue-50/60 border-blue-600 border-l-4'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              4
            </div>
            <div className="truncate space-y-0.5">
              <div className={`font-black text-[11px] uppercase tracking-wider ${currentStep === 4 ? 'text-blue-900' : 'text-slate-700'}`}>
                VALIDATION
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium truncate">Résumé et création du projet</div>
            </div>
          </div>
        </div>
      </div>

      {/* FORMULAIRE PRINCIPAL DE L'ÉTAPE COURANTE */}
      <form onSubmit={handleNext} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES (CHAMPS CONFORMES À MEDIA_1787740011274.PNG) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* EN-TÊTE DE SECTION AVEC NOTICE OBLIGATOIRE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-blue-900">1. INFORMATIONS GÉNÉRALES</h2>
                <p className="text-slate-500 text-xs mt-0.5">Veuillez renseigner les informations principales du projet.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
                <Info size={14} className="text-blue-600" />
                <span>Les champs marqués d'un <strong className="text-rose-600">*</strong> sont obligatoires.</span>
              </div>
            </div>

            {/* GRILLE DES CHAMPS DE L'ÉTAPE 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* COLONNE GAUCHE (9 COLS) : CHAMPS DE SAISIE */}
              <div className="lg:col-span-9 space-y-4">
                {/* LIGNE 1 : CODE PROJET | NOM DU PROJET | CLIENT */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Code projet <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={projectCodeNum}
                      onChange={e => setProjectCodeNum(e.target.value)}
                      placeholder="CIV-2026-ASS-003"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Nom du projet <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Construction du Lycée Technique de Kolda"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Client / Maître d'ouvrage <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={client}
                      onChange={e => setClient(e.target.value)}
                      placeholder="Ministère de l'Éducation Nationale"
                    />
                  </div>
                </div>

                {/* LIGNE 2 : PAYS | VILLE / LOCALISATION | RÉGION / DÉPARTEMENT */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Pays <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                    >
                      <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire</option>
                      <option value="Sénégal">🇸🇳 Sénégal</option>
                      <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                      <option value="Mali">🇲🇱 Mali</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Ville / Localisation <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Kolda"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Région / Département</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      placeholder="Kolda"
                    />
                  </div>
                </div>

                {/* LIGNE 3 : TYPE DE PROJET | NATURE DE L'OUVRAGE | CATÉGORIE DE CONTRAT */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Type de projet <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={projectType}
                      onChange={e => setProjectType(e.target.value)}
                    >
                      <option value="Bâtiment">Bâtiment</option>
                      <option value="Génie Civil">Génie Civil / Assainissement</option>
                      <option value="Hydraulique">Hydraulique Général & VRD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Nature de l'ouvrage <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={natureOuvrage}
                      onChange={e => setNatureOuvrage(e.target.value)}
                    >
                      <option value="Établissement scolaire">Établissement scolaire</option>
                      <option value="Station de Traitement des Boues">Station de Traitement des Boues</option>
                      <option value="Immeuble de Bureaux">Immeuble de Bureaux</option>
                      <option value="Infrastructure VRD">Infrastructure VRD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Catégorie de contrat <span className="text-rose-600">*</span></label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={contractCategory}
                      onChange={e => setContractCategory(e.target.value)}
                    >
                      <option value="Marché de travaux">Marché de travaux</option>
                      <option value="Conception-Réalisation">Conception-Réalisation</option>
                      <option value="Sous-traitance">Sous-traitance</option>
                    </select>
                  </div>
                </div>

                {/* LIGNE 4 : MONTANT DU MARCHÉ | DEVISE | TAUX DE CHANGE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Montant du marché (HT) <span className="text-rose-600">*</span></label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="any"
                        required
                        className="w-full p-2 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl font-mono font-extrabold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                        value={contractAmountHT}
                        onChange={e => setContractAmountHT(e.target.value)}
                        placeholder="15800000000"
                      />
                      <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-r-xl font-mono font-bold text-xs text-slate-700">
                        {currency} ▾
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Devise</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                    >
                      <option value="FCFA">FCFA</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Taux de change (référence)</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="w-full p-2 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                        value={exchangeRate}
                        onChange={e => setExchangeRate(e.target.value)}
                      />
                      <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-r-xl font-mono font-bold text-xs text-slate-700">
                        {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LIGNE 5 : DATES ET DURÉE */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Date de démarrage prévue <span className="text-rose-600">*</span></label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Durée contractuelle <span className="text-rose-600">*</span></label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        required
                        className="w-full p-2 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                        value={durationMonths}
                        onChange={e => setDurationMonths(e.target.value)}
                        placeholder="18"
                      />
                      <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-r-xl font-bold text-xs text-slate-700">
                        Mois ▾
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Date de fin contractuelle prévue <span className="text-rose-600">*</span></label>
                    <input
                      type="date"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={endDateContractual}
                      onChange={e => setEndDateContractual(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Date de fin révisée (estimée)</label>
                    <input
                      type="date"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                      value={endDateRevised}
                      onChange={e => setEndDateRevised(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* COLONNE DROITE (3 COLS) : LOGO DU CLIENT */}
              <div className="lg:col-span-3 space-y-3">
                <label className="block font-extrabold text-slate-700">Logo du client</label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center min-h-[180px]">
                  {clientLogoUrl ? (
                    <img src={clientLogoUrl} alt="Logo client" className="max-h-24 max-w-full object-contain rounded" />
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      {/* Logo armoiries nationales par défaut */}
                      <span className="text-3xl">🏛️</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Upload size={13} /> Changer
                  </button>
                </div>
              </div>
            </div>

            {/* LIGNE 6 : DESCRIPTION DU PROJET & OBJECTIFS PRINCIPAUX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Description du projet</label>
                <textarea
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition leading-relaxed"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Objectifs principaux</label>
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs font-semibold text-slate-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>Livrer un ouvrage conforme aux normes de qualité et aux délais contractuels.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>Assurer la sécurité des personnes et la protection de l'environnement.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>Optimiser les coûts et garantir la rentabilité du projet.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* LIGNE 7 : DIRECTEUR DE PROJET | CODE CENTRE DE COÛT | PRIORITÉ | STATUT INITIAL */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Directeur de projet assigné <span className="text-rose-600">*</span></label>
                <div className="relative flex items-center">
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition cursor-pointer"
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                  >
                    {users && users.length > 0 ? (
                      users.map(u => (
                        <option key={u.id || u.name} value={u.name}>
                          👤 {u.name} {u.role ? `(${u.role})` : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="SEA Alphonse">👤 SEA Alphonse (Directeur Projet)</option>
                        <option value="Yacouba Mohamed">👤 Yacouba Mohamed (Super Admin)</option>
                        <option value="Kouassi Kouadio">👤 Kouassi Kouadio (Direction Générale)</option>
                        <option value="Jean-Marc Traoré">👤 Jean-Marc Traoré (Directeur Technique)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Code centre de coût <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                  value={costCenterCode}
                  onChange={e => setCostCenterCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Priorité du projet <span className="text-rose-600">*</span></label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="Élevée">🟡 Élevée</option>
                  <option value="Critique">🔴 Critique</option>
                  <option value="Normale">🟢 Normale</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Statut initial</label>
                <div className="p-2 bg-blue-50 border border-blue-200 text-blue-800 font-extrabold rounded-xl text-center text-xs">
                  {initialStatus}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : CONTRAT */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-extrabold text-blue-900 border-b pb-2">2. INFORMATIONS CONTRACTUELLES & FINANCIÈRES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Référence du contrat *</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={contractRef}
                  onChange={e => setContractRef(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Avance de démarrage (%)</label>
                <input
                  type="number"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={advancePct}
                  onChange={e => setAdvancePct(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Retenue de garantie (%)</label>
                <input
                  type="number"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={retentionPct}
                  onChange={e => setRetentionPct(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Type de garanties exigées</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={guaranteeType}
                  onChange={e => setGuaranteeType(e.target.value)}
                />
              </div>
            </div>

            {/* SECTION IMPORTATION DQE / BPU CONTRACTUEL (SECTION 2 DU CAHIER DES CHARGES) */}
            <div className="bg-blue-50/60 border border-blue-200 p-5 rounded-2xl space-y-3 mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" /> RÉFÉRENTIEL CONTRACTUEL / DQE (OPTIONAL)
                  </h3>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Importez directement le fichier DQE / BPU (Excel/CSV) pour générer automatiquement l'arborescence WBS contractuelle du projet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDqeImportModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shrink-0 cursor-pointer transition"
                >
                  <FileText size={15} />
                  <span>[ IMPORTER DQE / BPU ]</span>
                </button>
              </div>

              {importedDqeCount > 0 && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 p-3 rounded-xl flex items-center justify-between font-bold text-xs">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>DQE Importé avec succès : <strong>{importedDqeCount} prix contractuels</strong></span>
                  </span>
                  <span className="font-mono text-blue-900 font-black">
                    Montant Marché HT : {Number(contractAmountHT).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : ÉQUIPE PROJET (UTILISATEURS DYNAMIQUES DU SYSTÈME) */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-extrabold text-blue-900 border-b pb-2">3. ÉQUIPE PROJET & PARTIES PRENANTES (COMPTES EXISTANTS)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Directeur de projet *</label>
                <select
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  value={manager}
                  onChange={e => setManager(e.target.value)}
                >
                  {users && users.length > 0 ? (
                    users.map(u => (
                      <option key={`pd-${u.id || u.name}`} value={u.name}>
                        👤 {u.name} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="SEA Alphonse">👤 SEA Alphonse (Directeur Projet)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Conducteur de travaux principal</label>
                <select
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  value={siteManager}
                  onChange={e => setSiteManager(e.target.value)}
                >
                  {users && users.length > 0 ? (
                    users.map(u => (
                      <option key={`sm-${u.id || u.name}`} value={u.name}>
                        👤 {u.name} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="KOUASSI Jean">👤 KOUASSI Jean (Conducteur de Travaux)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Responsable QSE / Sécurité</label>
                <select
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  value={qseManager}
                  onChange={e => setQseManager(e.target.value)}
                >
                  {users && users.length > 0 ? (
                    users.map(u => (
                      <option key={`qse-${u.id || u.name}`} value={u.name}>
                        👤 {u.name} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="KOUADIO Marc">👤 KOUADIO Marc (HSE / Sécurité)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Bureau de contrôle / AMO</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  value={controlOffice}
                  onChange={e => setControlOffice(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : VALIDATION ET SOUMISSION (RÉCAPITULATIF DYNAMIQUE 100% EN TEMPS RÉEL) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-blue-900">4. VALIDATION ET RÉSUMÉ DU PROJET</h2>
                <p className="text-slate-500 text-xs mt-0.5">Vérification de l'ensemble des données saisies avant la création officielle.</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full text-xs border border-emerald-200">
                100% Prêt à la création
              </span>
            </div>

            {/* GRILLE RÉCAPITULATIVE COMPLÈTE & DYNAMIQUE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CARTE 1 : INFORMATIONS GÉNÉRALES & IDENTITÉ */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <Building2 size={15} className="text-blue-600" /> Identité du Projet
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Code Projet :</span>
                    <strong className="font-mono text-blue-900 font-black">{generatedCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Nom du Projet :</span>
                    <strong className="text-slate-900 text-right max-w-[240px] truncate">{name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Client :</span>
                    <strong className="text-slate-800 text-right max-w-[240px] truncate">{client}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Localisation :</span>
                    <strong className="text-slate-800">{city}, {country}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Type & Nature :</span>
                    <strong className="text-slate-800">{projectType} ({natureOuvrage})</strong>
                  </div>
                </div>
              </div>

              {/* CARTE 2 : DONNÉES FINANCIÈRES & MARGE ESTIMÉE */}
              {(() => {
                const contractAmt = Number(contractAmountHT || 0);
                const importedWbsBudget = importedWbsNodes && importedWbsNodes.length > 0
                  ? importedWbsNodes.reduce((sum, n) => sum + Number(n.revisedBudget || n.initialBudget || 0), 0)
                  : 0;
                const estimatedBudgetDS = importedWbsBudget > 0 ? importedWbsBudget : Math.round(contractAmt * 0.82);
                const estimatedMargin = Math.max(0, contractAmt - estimatedBudgetDS);
                const marginPct = contractAmt > 0 ? ((estimatedMargin / contractAmt) * 100).toFixed(1) : '18.0';
                const dsPct = contractAmt > 0 ? ((estimatedBudgetDS / contractAmt) * 100).toFixed(1) : '82.0';

                return (
                  <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                    <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                      <DollarSign size={15} className="text-emerald-600" /> Montants & Engagements Financiers
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Montant Marché HT :</span>
                        <strong className="font-mono text-emerald-700 font-black text-sm">
                          {contractAmt.toLocaleString('fr-FR')} {currency}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Budget DS Estimé ({dsPct}%) :</span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {estimatedBudgetDS.toLocaleString('fr-FR')} {currency}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Marge Prévisionnelle ({marginPct}%) :</span>
                        <strong className="font-mono text-blue-700 font-bold">
                          {estimatedMargin.toLocaleString('fr-FR')} {currency}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Garantie & Caution :</span>
                        <strong className="text-slate-800 truncate max-w-[200px]">{guaranteeType}</strong>
                      </div>
                      {importedWbsNodes && importedWbsNodes.length > 0 && (
                        <div className="p-2 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1.5 border border-emerald-200 mt-1">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>Budget issu du DQE / BPU importé ({importedDqeCount} prix)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* CARTE 3 : DATES & PLANNING CONTRACTUEL */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <Calendar size={15} className="text-amber-600" /> Planning & Délais Contractuels
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Date de démarrage :</span>
                    <strong className="text-slate-900">{startDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Durée contractuelle :</span>
                    <strong className="text-slate-900">{durationMonths} Mois</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Fin contractuelle :</span>
                    <strong className="text-slate-900">{endDateContractual}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Fin révisée (estimée) :</span>
                    <strong className="text-slate-900">{endDateRevised || endDateContractual}</strong>
                  </div>
                </div>
              </div>

              {/* CARTE 4 : ÉQUIPE & RESPONSABLE ASSIGNÉ */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <Users size={15} className="text-purple-600" /> Équipe & Management Assigné
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Directeur de Projet :</span>
                    <strong className="text-slate-900 font-extrabold">👤 {manager}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Conducteur Travaux :</span>
                    <strong className="text-slate-800">👤 {siteManager}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Responsable QSE :</span>
                    <strong className="text-slate-800">👤 {qseManager}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Code Centre de Coût :</span>
                    <strong className="font-mono text-blue-900">{costCenterCode}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRE D'ACTIONS INFERIEURE DE NAVIGATION ENTRE ÉTAPES (STYLE MEDIA_1787740011274) */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition cursor-pointer"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Précédent
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <span>{currentStep === 4 ? 'Créer le projet' : 'Suivant'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </form>

      {/* MODALE D'IMPORTATION INTERACTIVE DQE / BPU (SECTION 2 & 3 DU CAHIER DES CHARGES) */}
      <DQEImportModal
        projectId={`P-${projectCodeNum}`}
        projectName={name || 'Nouveau Projet'}
        projectCode={generatedCode}
        isOpen={showDqeImportModal}
        onClose={() => setShowDqeImportModal(false)}
        onConfirmImport={(dqeItems, generatedNodes, summary) => {
          setContractAmountHT(summary.totalMarketAmount);
          setImportedWbsNodes(generatedNodes);
          setImportedDqeCount(summary.totalItems);
          alert(`Succès : ${summary.totalItems} prix DQE importés. Le montant marché HT (${summary.totalMarketAmount.toLocaleString('fr-FR')} FCFA) et l'arborescence WBS contractuelle ont été pré-remplis pour la création du projet !`);
        }}
      />
    </div>
  );
};
