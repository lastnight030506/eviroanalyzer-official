import React, { useState, useEffect } from 'react';
import { QCVNStandard, QCVNParameter } from '../types';
import { exportRegulationsToJson, importRegulationsFromJson } from '../services/regulations';
import { checkForUpdates, downloadAndInstallUpdate, relaunchApp, UpdateStatus } from '../services/updater';

interface Props {
  regulations: QCVNStandard[];
  onAdd: (reg: QCVNStandard) => void;
  onUpdate: (reg: QCVNStandard) => void;
  onDelete: (regId: string) => void;
  onReset: () => void;
  onImport: (regs: QCVNStandard[]) => void;
  isDarkMode: boolean;
}

const PlusIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const DownloadIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const UploadIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const RefreshIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const XIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const ChevronDownIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const ChevronUpIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
const UpdateIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const CheckCircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const SpinnerIcon = () => <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

const generateId = (): string => {
  return `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const RegulationManager: React.FC<Props> = ({
  regulations,
  onAdd,
  onUpdate,
  onDelete,
  onReset,
  onImport,
  isDarkMode,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingReg, setEditingReg] = useState<QCVNStandard | null>(null);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Auto-update states
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      const status = await checkForUpdates();
      setUpdateStatus(status);
      if (status.error) {
        setUpdateError(status.error);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setUpdateError(null);
    try {
      const success = await downloadAndInstallUpdate((downloaded, total) => {
        const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        setDownloadProgress(progress);
      });
      if (success) {
        // Will restart automatically
      } else {
        setUpdateError('Download failed. Please try again.');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to download update');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddNew = () => {
    const newReg: QCVNStandard = {
      id: generateId(),
      name: "New Regulation",
      description: "",
      category: "Water",
      parameters: [],
    };
    setEditingReg(newReg);
    setIsEditing(true);
  };

  const handleEdit = (reg: QCVNStandard) => {
    setEditingReg({ ...reg });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingReg) return;
    
    if (editingReg.name.trim() === "") {
      alert("Regulation name is required");
      return;
    }

    try {
      const existingReg = regulations.find(r => r.id === editingReg.id);
      if (existingReg) {
        await onUpdate(editingReg);
      } else {
        await onAdd(editingReg);
      }
      setIsEditing(false);
      setEditingReg(null);
    } catch (error) {
      console.error('Failed to save regulation:', error);
      alert(`Failed to save regulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingReg(null);
  };

  const handleDelete = (regId: string) => {
    setShowDeleteConfirm(regId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      onDelete(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const handleExport = () => {
    const json = exportRegulationsToJson(regulations);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regulations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const imported = importRegulationsFromJson(content);
      if (imported) {
        onImport(imported);
        setImportError(null);
      } else {
        setImportError("Invalid JSON format. Please check your file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const addParameter = () => {
    if (!editingReg) return;
    const newParam: QCVNParameter = {
      id: `param-${Date.now()}`,
      name: "",
      unit: "",
      limit: 0,
      type: "max",
    };
    setEditingReg({
      ...editingReg,
      parameters: [...editingReg.parameters, newParam],
    });
  };

  const updateParameter = (index: number, field: keyof QCVNParameter, value: string | number) => {
    if (!editingReg) return;
    const updatedParams = [...editingReg.parameters];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setEditingReg({ ...editingReg, parameters: updatedParams });
  };

  const removeParameter = (index: number) => {
    if (!editingReg) return;
    const updatedParams = editingReg.parameters.filter((_, i) => i !== index);
    setEditingReg({ ...editingReg, parameters: updatedParams });
  };

  const toggleExpand = (regId: string) => {
    setExpandedRegId(expandedRegId === regId ? null : regId);
  };

  if (isEditing && editingReg) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {regulations.find(r => r.id === editingReg.id) ? "Edit Regulation" : "New Regulation"}
          </h3>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={editingReg.name}
                onChange={(e) => setEditingReg({ ...editingReg, name: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                placeholder="e.g., QCVN 08-MT:2015"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={editingReg.category}
                onChange={(e) => setEditingReg({ ...editingReg, category: e.target.value as "Water" | "Air" | "Soil" })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                <option value="Water">Water</option>
                <option value="Air">Air</option>
                <option value="Soil">Soil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={editingReg.description}
              onChange={(e) => setEditingReg({ ...editingReg, description: e.target.value })}
              rows={2}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
              placeholder="Brief description of this regulation..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Parameters ({editingReg.parameters.length})
              </label>
              <button
                onClick={addParameter}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
              >
                <PlusIcon /> Add Parameter
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Limit</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Action</div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {editingReg.parameters.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">
                    No parameters yet. Click "Add Parameter" to add one.
                  </div>
                ) : (
                  editingReg.parameters.map((param, index) => (
                    <div
                      key={param.id}
                      className="grid grid-cols-12 gap-2 p-3 border-b border-slate-100 dark:border-slate-800 items-center"
                    >
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateParameter(index, "name", e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                          placeholder="Parameter name"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={param.unit}
                          onChange={(e) => updateParameter(index, "unit", e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                          placeholder="mg/L"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          value={param.limit}
                          onChange={(e) => updateParameter(index, "limit", parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={param.type}
                          onChange={(e) => updateParameter(index, "type", e.target.value as "max" | "min")}
                          className="w-full p-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '1.75rem' }}
                        >
                          <option value="max">Max</option>
                          <option value="min">Min</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <button
                          onClick={() => removeParameter(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
          >
            Save Regulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded transition-colors"
        >
          <PlusIcon /> Add New Regulation
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded transition-colors"
        >
          <DownloadIcon /> Export to JSON
        </button>
        <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded transition-colors cursor-pointer"
        >
          <UploadIcon /> Import from JSON
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshIcon /> Reset to Defaults
        </button>
      </div>

      {importError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded text-sm text-rose-600 dark:text-rose-400">
          {importError}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Regulations ({regulations.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {regulations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <p>No regulations configured.</p>
              <p className="text-sm mt-1">Add a new regulation or import from JSON.</p>
            </div>
          ) : (
            regulations.map((reg) => (
              <div key={reg.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">{reg.name}</h4>
                      <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                        {reg.category}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                        {reg.parameters.length} params
                      </span>
                    </div>
                    {reg.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{reg.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleExpand(reg.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title={expandedRegId === reg.id ? "Collapse" : "Expand"}
                    >
                      {expandedRegId === reg.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                    <button
                      onClick={() => handleEdit(reg)}
                      className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(reg.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {expandedRegId === reg.id && reg.parameters.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 dark:text-slate-400">
                          <th className="text-left py-2">Parameter</th>
                          <th className="text-left py-2">Unit</th>
                          <th className="text-left py-2">Limit</th>
                          <th className="text-left py-2">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reg.parameters.map((param) => (
                          <tr key={param.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-2 text-slate-700 dark:text-slate-300">{param.name || "(unnamed)"}</td>
                            <td className="py-2 text-slate-600 dark:text-slate-400">{param.unit}</td>
                            <td className="py-2 font-mono text-slate-700 dark:text-slate-300">{param.limit}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                param.type === 'max' 
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                  : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                              }`}>
                                {param.type === 'max' ? 'Maximum' : 'Minimum'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this regulation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Software Updates Section */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <UpdateIcon />
          Software Updates
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Version</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">v1.0.0</p>
            </div>
            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate || isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-400 text-white rounded-lg transition-colors"
            >
              {isCheckingUpdate ? (
                <>
                  <SpinnerIcon />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshIcon />
                  Check for Updates
                </>
              )}
            </button>
          </div>

          {/* Update Status Display */}
          {updateStatus && !updateStatus.available && !updateError && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircleIcon />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">You're up to date!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">EnviroAnalyzer Pro is running the latest version.</p>
              </div>
            </div>
          )}

          {updateStatus?.available && updateStatus.info && (
            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
                    New Version Available: v{updateStatus.info.version}
                  </p>
                  <p className="text-xs text-sky-600 dark:text-sky-500 mt-1">
                    Released: {new Date(updateStatus.info.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-sky-500 text-white rounded">NEW</span>
              </div>
              
              {updateStatus.info.body && (
                <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border border-sky-100 dark:border-sky-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Release Notes:</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {updateStatus.info.body}
                  </p>
                </div>
              )}

              {isDownloading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Downloading update...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownloadUpdate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <DownloadIcon />
                  Download & Install Update
                </button>
              )}
            </div>
          )}

          {updateError && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ExclamationIcon />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Update Check Failed</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">{updateError}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p>Updates are downloaded from GitHub Releases. Auto-update is available in production builds.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegulationManager;
