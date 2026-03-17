import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { Report, CorruptionType } from '../types';
import { DEFAULT_CORRUPTION_TYPES } from '../constants';
import { Trash2, Edit, LogOut, Plus, Settings, FileText, Check, X, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [corruptionTypes, setCorruptionTypes] = useState<CorruptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'types'>('reports');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const navigate = useNavigate();

  // For editing
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editingType, setEditingType] = useState<CorruptionType | null>(null);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newType, setNewType] = useState<Partial<CorruptionType>>({ name: '', icon: '📁', color: '#6b7280' });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const isAdminEmail = u.email === 'memory02backup@gmail.com';
        if (isAdminEmail || (userDoc.exists() && userDoc.data().role === 'admin')) {
          setUser(u);
        } else {
          await signOut(auth);
          navigate('/admin');
        }
      } else {
        navigate('/admin');
      }
    });

    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    const qTypes = query(collection(db, 'corruptionTypes'));
    const unsubscribeTypes = onSnapshot(qTypes, (snapshot) => {
      if (snapshot.empty) {
        // If empty, we might want to seed it or just use defaults
        // For now, let's just show defaults if nothing in DB
        setCorruptionTypes(DEFAULT_CORRUPTION_TYPES);
      } else {
        const typesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CorruptionType[];
        setCorruptionTypes(typesData);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'corruptionTypes');
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReports();
      unsubscribeTypes();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin');
  };

  const deleteReport = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteDoc(doc(db, 'reports', id));
        setStatus({ type: 'success', message: 'Report deleted successfully' });
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to delete report' });
        handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
      }
    }
  };

  const updateReport = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'reports', id), updates);
      setEditingReport(null);
      setStatus({ type: 'success', message: 'Report updated successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update report' });
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const addCorruptionType = async () => {
    if (!newType.name) return;
    try {
      await addDoc(collection(db, 'corruptionTypes'), newType);
      setIsAddingType(false);
      setNewType({ name: '', icon: '📁', color: '#6b7280' });
      setStatus({ type: 'success', message: 'Corruption type added successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to add corruption type' });
      handleFirestoreError(error, OperationType.CREATE, 'corruptionTypes');
    }
  };

  const updateCorruptionType = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'corruptionTypes', id), updates);
      setEditingType(null);
      setStatus({ type: 'success', message: 'Corruption type updated successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update corruption type' });
      handleFirestoreError(error, OperationType.UPDATE, `corruptionTypes/${id}`);
    }
  };

  const deleteCorruptionType = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this type?')) {
      try {
        await deleteDoc(doc(db, 'corruptionTypes', id));
        setStatus({ type: 'success', message: 'Corruption type deleted successfully' });
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to delete corruption type' });
        handleFirestoreError(error, OperationType.DELETE, `corruptionTypes/${id}`);
      }
    }
  };

  if (loading) {
// ...
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Logged in as {user?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="flex gap-2 mb-8 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-fit">
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText size={18} /> Reports ({reports.length})
        </button>
        <button 
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'types' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Settings size={18} /> Corruption Types
        </button>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
            <p className="font-bold">{status.message}</p>
          </div>
          <button onClick={() => setStatus(null)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
      )}

      {activeTab === 'reports' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Report</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Votes</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{report.title}</div>
                      <div className="text-xs text-gray-400">{report.locationName} • {new Date(report.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase">
                        {report.corruptionType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="text-green-600">T: {report.votesTrue}</span>
                        <span className="text-red-600">F: {report.votesFalse}</span>
                        <span className="text-yellow-600">E: {report.votesNeedEvidence}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingReport(report)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteReport(report.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">Manage Corruption Types</h2>
            <button 
              onClick={() => setIsAddingType(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-red-700 transition-all"
            >
              <Plus size={18} /> Add New Type
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {corruptionTypes.map(type => (
              <div key={type.id || type.name} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900">{type.name}</p>
                    <div className="w-4 h-1 rounded-full" style={{ backgroundColor: type.color }}></div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingType(type)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => type.id && deleteCorruptionType(type.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-xl font-black text-gray-900">Edit Report</h3>
              <button onClick={() => setEditingReport(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                  <input 
                    type="text"
                    value={editingReport.title}
                    onChange={(e) => setEditingReport({...editingReport, title: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corruption Type</label>
                  <select 
                    value={editingReport.corruptionType}
                    onChange={(e) => setEditingReport({...editingReport, corruptionType: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {corruptionTypes.map(t => (
                      <option key={t.id || t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea 
                  rows={4}
                  value={editingReport.description}
                  onChange={(e) => setEditingReport({...editingReport, description: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location Name</label>
                  <input 
                    type="text"
                    value={editingReport.locationName}
                    onChange={(e) => setEditingReport({...editingReport, locationName: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                  <input 
                    type="date"
                    value={editingReport.date}
                    onChange={(e) => setEditingReport({...editingReport, date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">True Votes</label>
                  <input 
                    type="number"
                    value={editingReport.votesTrue}
                    onChange={(e) => setEditingReport({...editingReport, votesTrue: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">False Votes</label>
                  <input 
                    type="number"
                    value={editingReport.votesFalse}
                    onChange={(e) => setEditingReport({...editingReport, votesFalse: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Evidence Votes</label>
                  <input 
                    type="number"
                    value={editingReport.votesNeedEvidence}
                    onChange={(e) => setEditingReport({...editingReport, votesNeedEvidence: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Evidence Links */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Evidence Links (Images/URLs)</label>
                <div className="space-y-2">
                  {editingReport.evidenceLinks?.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...(editingReport.evidenceLinks || [])];
                          newLinks[idx] = e.target.value;
                          setEditingReport({...editingReport, evidenceLinks: newLinks});
                        }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <button 
                        onClick={() => {
                          const newLinks = editingReport.evidenceLinks?.filter((_, i) => i !== idx);
                          setEditingReport({...editingReport, evidenceLinks: newLinks});
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setEditingReport({...editingReport, evidenceLinks: [...(editingReport.evidenceLinks || []), '']})}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Add Link
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3 rounded-b-3xl">
              <button 
                onClick={() => setEditingReport(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateReport(editingReport.id, {
                  title: editingReport.title,
                  description: editingReport.description,
                  corruptionType: editingReport.corruptionType,
                  locationName: editingReport.locationName,
                  date: editingReport.date,
                  votesTrue: editingReport.votesTrue,
                  votesFalse: editingReport.votesFalse,
                  votesNeedEvidence: editingReport.votesNeedEvidence,
                  evidenceLinks: editingReport.evidenceLinks
                })}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Type Modal */}
      {(isAddingType || editingType) && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">
                {isAddingType ? 'Add Corruption Type' : 'Edit Corruption Type'}
              </h3>
              <button 
                onClick={() => {
                  setIsAddingType(false);
                  setEditingType(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name (Bengali/English)</label>
                <input 
                  type="text"
                  value={isAddingType ? newType.name : editingType?.name}
                  onChange={(e) => {
                    if (isAddingType) setNewType({...newType, name: e.target.value});
                    else if (editingType) setEditingType({...editingType, name: e.target.value});
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="e.g. ঘুষ (Bribery)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Icon (Emoji)</label>
                  <input 
                    type="text"
                    value={isAddingType ? newType.icon : editingType?.icon}
                    onChange={(e) => {
                      if (isAddingType) setNewType({...newType, icon: e.target.value});
                      else if (editingType) setEditingType({...editingType, icon: e.target.value});
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="e.g. 💰"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color (Hex)</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={isAddingType ? newType.color : editingType?.color}
                      onChange={(e) => {
                        if (isAddingType) setNewType({...newType, color: e.target.value});
                        else if (editingType) setEditingType({...editingType, color: e.target.value});
                      }}
                      className="h-12 w-12 rounded-xl border-none p-0 overflow-hidden cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={isAddingType ? newType.color : editingType?.color}
                      onChange={(e) => {
                        if (isAddingType) setNewType({...newType, color: e.target.value});
                        else if (editingType) setEditingType({...editingType, color: e.target.value});
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => {
                  setIsAddingType(false);
                  setEditingType(null);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (isAddingType) addCorruptionType();
                  else if (editingType && editingType.id) updateCorruptionType(editingType.id, {
                    name: editingType.name,
                    icon: editingType.icon,
                    color: editingType.color
                  });
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg transition-all"
              >
                {isAddingType ? 'Add Type' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

