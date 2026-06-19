import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Send, RotateCcw, AlertCircle, CheckCircle, Package, Download, Upload, FileUp, X } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import SparePartsDashboard from './SparePartsDashboard';
import AddDamagedKit from './AddDamagedKit';

const KIT_TYPES = ['BioRugged', 'Laxton', 'Emptech'];
const COMPONENTS = [
  'Fingerprint Scanner',
  'Face Camera',
  'Iris Scanner',
  'Document Scanner',
  'Iris Cables',
  'Laptop',
  'Kit Charger',
  'Hub',
    try {
  const [bulkImportErrors, setBulkImportErrors] = useState([]);
  const [bulkImportProgress, setBulkImportProgress] = useState(0);
  const [bulkImportResults, setBulkImportResults] = useState(null);
  const [, setBulkImportFile] = useState(null);

  // Bulk distribute states
  const [showBulkDistribute, setShowBulkDistribute] = useState(false);
  const [bulkDistributeData, setBulkDistributeData] = useState([]);
  const [bulkDistributeErrors, setBulkDistributeErrors] = useState([]);
  const [bulkDistributeProgress, setBulkDistributeProgress] = useState(0);
  const [bulkDistributeResults, setBulkDistributeResults] = useState(null);
  const [, setBulkDistributeFile] = useState(null);

  // Auth states
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [signUpError, setSignUpError] = useState(null);
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Form states
  const [newKit, setNewKit] = useState({
    kitNumber: '',
    type: 'BioRugged',
    location: 'Store',
    status: 'in-stock'
  });

  const [editKitForm, setEditKitForm] = useState({
    id: '',
    kitNumber: '',
    type: 'BioRugged',
    location: '',
    status: 'in-stock'
  });

  const [distributeForm, setDistributeForm] = useState({
    kitId: '',
    partner: '',
    quantity: 1,
    notes: ''
  });

  const [returnForm, setReturnForm] = useState({
    kitId: '',
    quantity: 1,
    condition: 'good',
    notes: ''
  });

  const [newSparePart, setNewSparePart] = useState({
    type: COMPONENTS[0],
    kitType: 'BioRugged',
    quantity: 1,
    location: '',
    notes: ''
  });

  const [useSparePartForm, setUseSparePartForm] = useState({
    sparePartId: '',
    kitId: '',
    partner: '',
    notes: '',
    quantity: 1
  });

  const [editSparePartForm, setEditSparePartForm] = useState({
    id: '',
    type: COMPONENTS[0],
    kitType: 'BioRugged',
    quantity: 1,
    location: '',
    notes: ''
  });
  
  // Safe insert helper: attempts to insert into `movements`, and if PostgREST
  // reports a missing column in the schema cache, removes that key and retries.
  const safeInsertMovement = async (payload) => {
    let attemptPayload = Array.isArray(payload) ? payload.map(p => ({ ...p })) : { ...payload };
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: insertData, error: insertError } = await supabase.from('movements').insert(attemptPayload);
      if (!insertError) return { data: insertData, error: null };

      const msg = insertError?.message || insertError?.msg || '';
      const match = msg.match(/Could not find.*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        const missingCol = match[1].trim();
        if (Array.isArray(attemptPayload)) {
          attemptPayload = attemptPayload.map(obj => {
            const copy = { ...obj };
            if (copy.hasOwnProperty(missingCol)) delete copy[missingCol];
            else {
              const key = Object.keys(copy).find(k => k.toLowerCase() === missingCol.toLowerCase());
              if (key) delete copy[key];
            }
            return copy;
          });
          continue;
        } else {
          if (attemptPayload.hasOwnProperty(missingCol)) {
            delete attemptPayload[missingCol];
            continue;
          }
          const key = Object.keys(attemptPayload).find(k => k.toLowerCase() === missingCol.toLowerCase());
          if (key) {
            delete attemptPayload[key];
            continue;
          }
        }
      }

      // Unknown error or couldn't parse missing column -> return error
      return { data: null, error: insertError };
    }

    return { data: null, error: new Error('Failed to insert movement after removing unknown columns') };
  };

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    partner: 'all'
  });

  const [activityLogFilters, setActivityLogFilters] = useState({
    partner: 'all',
    startDate: '',
    endDate: '',
    sparePartOnly: false
  });

  const [sparePartsFilters, setSparePartsFilters] = useState({
    kitType: 'all',
    componentType: 'all'
  });

  const [dashboardFilters, setDashboardFilters] = useState({
    kitNumber: ''
  });

  const clearFilters = () => setFilters({ search: '', status: 'all', type: 'all', partner: 'all' });
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.type !== 'all' || filters.partner !== 'all';
  const clearActivityLogFilters = () => setActivityLogFilters({ partner: 'all', startDate: '', endDate: '', sparePartOnly: false });
  const hasActiveActivityLogFilters = activityLogFilters.partner !== 'all' || activityLogFilters.startDate || activityLogFilters.endDate || activityLogFilters.sparePartOnly;
  const clearSparePartsFilters = () => setSparePartsFilters({ kitType: 'all', componentType: 'all' });
  const hasActiveSparePartsFilters = sparePartsFilters.kitType !== 'all' || sparePartsFilters.componentType !== 'all';

  // Demo data for initial load
  const loadDemoData = useCallback(() => {
    const demoKits = [
      {
        id: 'BR001',
        kitNumber: 'BR001',
        type: 'BioRugged',
        location: 'Store',
        status: 'in-stock',
        components: COMPONENTS.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
        createdAt: new Date().toISOString()
      },
      {
        id: 'LX002',
        kitNumber: 'LX002',
        type: 'Laxton',
        location: 'Store',
        status: 'in-stock',
        components: COMPONENTS.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
        createdAt: new Date().toISOString()
      },
      {
        id: 'ET003',
        kitNumber: 'ET003',
        type: 'Emptech',
        location: 'store',
        status: 'distributed',
        assignedTo: '',
        components: COMPONENTS.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
        createdAt: new Date().toISOString()
      }
    ];
    setKits(demoKits);
  }, []);

  

  // Load data from storage
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: kitsData, error: kitsError },
        { data: movementsData, error: movementsError },
        { data: sparePartsData, error: sparePartsError }
      ] = await Promise.all([
        supabase.from('kits').select('*').order('created_at', { ascending: false }),
        supabase.from('movements').select('*').order('timestamp', { ascending: false }),
        supabase.from('spare_parts').select('*').order('created_at', { ascending: false })
      ]);

      if (kitsError) throw kitsError;
      if (movementsError) throw movementsError;
      if (sparePartsError) throw sparePartsError;

      // Map snake_case to camelCase for UI compatibility
      const mappedKits = (kitsData || []).map(k => ({
        ...k,
        kitNumber: k.kit_number,
        assignedTo: k.assigned_to,
        createdAt: k.created_at,
        distributedAt: k.distributed_at,
        returnedAt: k.returned_at
      }));

      const mappedSpareParts = (sparePartsData || []).map(s => ({
        ...s,
        kitType: s.kit_type,
        createdAt: s.created_at
      }));

      const mappedMovements = (movementsData || []).map(m => ({
        ...m,
        kitId: m.kit_id,
        createdAt: m.timestamp // Some UI might use createdAt
      }));

      setKits(mappedKits);
      setMovements(mappedMovements);
      setSpareParts(mappedSpareParts);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      loadDemoData();
    }
    setLoading(false);
  }, [loadDemoData]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) console.error('Error fetching profile:', error);
      else setProfile(data);
    } catch (err) {
      console.error('Profile fetch failed:', err);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    const email = loginForm.identifier.includes('@') 
      ? loginForm.identifier 
      : `${loginForm.identifier}@nid.gov`;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginForm.password
      });

      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Invalid username or password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    setSignUpError(null);
    if (!signUpForm.fullName || !signUpForm.email || !signUpForm.password) {
      setSignUpError('Please fill in all fields');
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setSignUpError('Passwords do not match');
      return;
    }
    if (signUpForm.password.length < 6) {
      setSignUpError('Password must be at least 6 characters');
      return;
    }

    setSignUpLoading(true);
    try {
      const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const _supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!_supabaseUrl || !_supabaseAnonKey) {
        setSignUpError('Supabase env vars missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env and restart the dev server.');
        setSignUpLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: signUpForm.email,
        password: signUpForm.password
      });

      if (error) throw error;

      const userId = data?.user?.id || data?.data?.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: signUpForm.fullName,
          role: 'Staff'
        });
        if (profileError) console.error('Failed to create profile:', profileError);
      }

      // Try signing in automatically (may fail if email confirmation required)
      const signInResp = await supabase.auth.signInWithPassword({
        email: signUpForm.email,
        password: signUpForm.password
      });

      // If sign-in returned an error, surface a helpful message.
      if (signInResp.error) {
        console.warn('Post-signup signin attempt failed:', signInResp.error);
        // If user object exists from signUp but there's no session, it's likely
        // that email confirmation is required by Supabase settings.
        if ((data && (data.user || data.data?.user)) && !signInResp.data?.session) {
          setSignUpError('Account created — please check your email and confirm your address before signing in.');
        } else {
          setSignUpError(signInResp.error.message || 'Account created, but automatic sign-in failed');
        }
      } else {
        // Successful sign-in: set user and fetch profile immediately
        const session = signInResp.data?.session;
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
      }

      setShowSignUp(false);
      setSignUpForm({ fullName: '', email: '', password: '', confirmPassword: '' });
    } catch (err) {
      console.error('Signup error:', err);
      const fetchMsg = (err && err.message) || '';
      const status = err?.status || err?.response?.status;

      // Handle rate-limit responses from the auth/email service
      if (
        status === 429 ||
        fetchMsg.toLowerCase().includes('rate limit') ||
        fetchMsg.toLowerCase().includes('email rate limit')
      ) {
        setSignUpError('Email rate limit exceeded. Please wait a few minutes before trying again, or use a different email address.');
      } else if (fetchMsg.includes('Failed to fetch')) {
        setSignUpError('Network request failed. Check your Supabase URL, network connectivity, and CORS settings (add your dev origin to Supabase allowed origins).');
      } else {
        // include cause message when available
        const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : '';
        setSignUpError(`${err.message || 'Failed to create account'}${causeMsg}`);
      }
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    if (user) {
      // Call loadData asynchronously to avoid synchronous setState inside an effect
      Promise.resolve().then(() => loadData());
    }
  }, [user, loadData]);

  // Add new kit
  const handleAddKit = async () => {
    if (!newKit.kitNumber || !newKit.type || !newKit.location) {
      alert('Please fill in all fields');
      return;
    }

    const kitData = {
      id: newKit.kitNumber,
      kit_number: newKit.kitNumber,
      type: newKit.type,
      location: newKit.location,
      status: 'in-stock',
      components: COMPONENTS.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
    };

    const movementData = {
      type: 'kit-registered',
      kit_id: kitData.id,
      description: `Kit ${kitData.kit_number} registered`,
    };

    try {
      const { error: kitError } = await supabase.from('kits').insert(kitData);
      if (kitError) throw kitError;

      const { data: moveData, error: moveError } = await safeInsertMovement(movementData);
      if (moveError) throw moveError;

      loadData();
      setShowAddKit(false);
      setNewKit({ kitNumber: '', type: 'BioRugged', location: '', status: 'in-stock' });
    } catch (error) {
      console.error('Error adding kit:', error);
      alert('Failed to register kit. Please check if the kit number already exists.');
    }
  };

  // Distribute kit
  const handleDistribute = async () => {
    if (!distributeForm.partner) {
      alert('Please select a partner');
      return;
    }

    try {
      const { error: kitError } = await supabase
        .from('kits')
        .update({
          status: 'distributed',
          assigned_to: distributeForm.partner,
          distributed_at: new Date().toISOString()
        })
        .eq('id', distributeForm.kitId);

      if (kitError) throw kitError;

      const { data: moveData, error: moveError } = await safeInsertMovement({
        type: 'distribution',
        kit_id: distributeForm.kitId,
        partner: distributeForm.partner,
        description: `Kit ${distributeForm.kitId} distributed to ${distributeForm.partner}`,
        notes: distributeForm.notes
      });

      if (moveError) throw moveError;

      loadData();
      setShowDistribute(null);
      setDistributeForm({ kitId: '', partner: '', quantity: 1, notes: '' });
    } catch (error) {
      console.error('Error distributing kit:', error);
      alert('Failed to distribute kit.');
    }
  };

  // Return kit
  const handleReturn = async (kitId) => {
    try {
      const { error: kitError } = await supabase
        .from('kits')
        .update({
          status: 'in-stock',
          assigned_to: null,
          returned_at: new Date().toISOString()
        })
        .eq('id', kitId);

      if (kitError) throw kitError;

      const { data: moveData, error: moveError } = await safeInsertMovement({
        type: 'return',
        kit_id: kitId,
        description: `Kit ${kitId} returned to stock`,
        timestamp: new Date().toISOString()
      });

      if (moveError) throw moveError;

      loadData();
    } catch (error) {
      console.error('Error returning kit:', error);
      alert('Failed to return kit.');
    }
  };

  // Edit kit
  const handleEditKit = async () => {
    if (!editKitForm.kitNumber || !editKitForm.location) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('kits')
        .update({
          kit_number: editKitForm.kitNumber,
          type: editKitForm.type,
          location: editKitForm.location,
          status: editKitForm.status
        })
        .eq('id', editKitForm.id);

      if (error) throw error;

      loadData();
      setShowEditKit(null);
    } catch (error) {
      console.error('Error editing kit:', error);
      alert('Failed to update kit.');
    }
  };

  // Delete kit
  const handleDeleteKit = async (kitId) => {
    if (!confirm('Are you sure you want to delete this kit?')) return;

    try {
      const { error } = await supabase
        .from('kits')
        .delete()
        .eq('id', kitId);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error('Error deleting kit:', error);
      alert('Failed to delete kit.');
    }
  };

  // Spare Parts Handlers
  const handleRegisterSparePart = async () => {
    if (!newSparePart.location || newSparePart.quantity <= 0) {
      alert('Please fill in quantity and location');
      return;
    }

    try {
      const { error: spareError } = await supabase
        .from('spare_parts')
        .insert({
          type: newSparePart.type,
          kit_type: newSparePart.kitType,
          quantity: parseInt(newSparePart.quantity),
          location: newSparePart.location,
          notes: newSparePart.notes
        });

      if (spareError) throw spareError;

      const { error: moveError } = await supabase
        .from('movements')
        .insert({
          type: 'spare-registered',
          description: `${newSparePart.quantity}x ${newSparePart.type} spares added to ${newSparePart.location}`,
          quantity: parseInt(newSparePart.quantity),
          notes: newSparePart.notes
        });

      if (moveError) throw moveError;

      loadData();
      setNewSparePart({
        type: COMPONENTS[0],
        kitType: 'BioRugged',
        quantity: 1,
        location: '',
        notes: ''
      });
      setShowAddSparePart(false);
    } catch (error) {
      console.error('Error registering spare part:', error);
      alert('Failed to register spare part.');
    }
  };

  const handleUseSparePart = async () => {
    const spare = spareParts.find(s => s.id === showUseSparePart);
    if (!spare) {
      alert('Selected spare part not found');
      return;
    }

    const quantity = parseInt(useSparePartForm.quantity, 10);
    if (quantity > spare.quantity) {
      alert('Not enough stock available');
      return;
    }

    try {
      // Coerce id type for safety (some DBs use integer ids)
      let idForQuery = spare.id;
      if (typeof spare.id === 'string' && /^\d+$/.test(spare.id)) idForQuery = parseInt(spare.id, 10);

      const { data: updatedSpare, error: spareError } = await supabase
        .from('spare_parts')
        .update({ quantity: spare.quantity - quantity })
        .eq('id', idForQuery)
        .select();

      if (spareError) throw spareError;
      if (!updatedSpare || updatedSpare.length === 0) throw new Error('No rows updated for spare part');

      let desc = `${quantity}x ${spare.type} used for repair/replacement`;

      // Resolve kit identifier to the canonical kit id used by the DB
      let kitIdInput = useSparePartForm.kitId ? String(useSparePartForm.kitId).trim() : '';
      let resolvedKitId = null;
      if (kitIdInput) {
        const found = kits.find(k => String(k.kitNumber) === kitIdInput || String(k.id) === kitIdInput);
        if (!found) {
          alert(`Kit "${kitIdInput}" not found in inventory. Please enter a valid kit identifier or leave blank.`);
          return;
        }
        resolvedKitId = found.id;
        desc += ` on Kit ${found.kitNumber || found.id}`;
      }

      if (useSparePartForm.partner) desc += ` - Allocated to: ${useSparePartForm.partner}`;

      const movementPayload = {
        type: 'spare-usage',
        kit_id: resolvedKitId,
        partner: useSparePartForm.partner,
        description: desc,
        quantity: quantity,
        notes: useSparePartForm.notes,
        timestamp: new Date().toISOString()
      };

      const { data: moveData, error: moveError } = await safeInsertMovement(movementPayload);
      if (moveError) throw moveError;

      loadData();
      setShowUseSparePart(null);
      setUseSparePartForm({ kitId: '', quantity: 1, partner: '', notes: '' });
    } catch (error) {
      console.error('Error using spare part:', error);
      alert(error?.message || 'Failed to update spare part usage.');
    }
  };

  const handleEditSparePart = async () => {
    if (!editSparePartForm.id) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .update({
          type: editSparePartForm.type,
          kit_type: editSparePartForm.kitType,
          quantity: parseInt(editSparePartForm.quantity, 10),
          location: editSparePartForm.location,
          notes: editSparePartForm.notes
        })
        .eq('id', editSparePartForm.id);

      if (error) throw error;

      loadData();
      setShowEditSparePart(null);
    } catch (error) {
      console.error('Error editing spare part:', error);
      alert('Failed to update spare part.');
    }
  };

  const handleDeleteSparePart = async (spareId) => {
    if (!confirm('Are you sure you want to delete this spare part?')) return;

    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', spareId);

      if (error) throw error;

      // record deletion in movements for audit
      const { error: moveError } = await supabase
        .from('movements')
        .insert({
          type: 'spare-deleted',
          description: `Spare part ${spareId} deleted`,
          timestamp: new Date().toISOString()
        });

      if (moveError) throw moveError;

      loadData();
    } catch (err) {
      console.error('Error deleting spare part:', err);
      alert('Failed to delete spare part.');
    }
  };

  // Report damaged kit
  const handleReportDamagedKit = async (data) => {
    try {
      // helper: attempt to insert into movements, and if PostgREST complains about unknown columns
      // remove those keys and retry. This allows the frontend to work even if optional
      // columns like `damaged_components` or `damaged_component_other` are not present in the DB.
      const safeInsertMovement = async (payload) => {
        let attemptPayload = { ...payload };
        for (let i = 0; i < 5; i++) {
          const { data: insertData, error: insertError } = await supabase.from('movements').insert(attemptPayload);
          if (!insertError) return { data: insertData, error: null };

          const msg = insertError?.message || insertError?.msg || '';
          const match = msg.match(/Could not find the '\\'?"?([^'"\\)]+)\\"?'? column/);
          if (match && match[1]) {
            const missingCol = match[1].trim();
            // remove the matching key from payload (try exact and snake_case match)
            if (attemptPayload.hasOwnProperty(missingCol)) {
              delete attemptPayload[missingCol];
              continue;
            }
            // try to find a key that matches case-insensitively
            const keyToRemove = Object.keys(attemptPayload).find(k => k.toLowerCase() === missingCol.toLowerCase());
            if (keyToRemove) {
              delete attemptPayload[keyToRemove];
              continue;
            }
          }

          // if we couldn't parse a missing-column error, return the error
          return { data: null, error: insertError };
        }

        return { data: null, error: new Error('Failed to insert movement after removing unknown columns') };
      };

      // find kit by id or kit_number to get the canonical id
      const orFilter = `id.eq.${data.kitNumber},kit_number.eq.${data.kitNumber}`;
      const { data: foundKits, error: findError } = await supabase
        .from('kits')
        .select('id, kit_number')
        .or(orFilter)
        .limit(1);

      if (findError) throw findError;
      if (!foundKits || foundKits.length === 0) {
        alert(`Kit not found: ${data.kitNumber}`);
        return;
      }

      const kitId = foundKits[0].id;

      const { error: kitError } = await supabase
        .from('kits')
        .update({ status: 'damaged', assigned_to: data.partner })
        .eq('id', kitId);

      if (kitError) throw kitError;

      const movementPayload = {
        type: 'damage-report',
        kit_id: kitId,
        partner: data.partner,
        machine_type: data.machineType,
        damaged_components: Array.isArray(data.damagedComponents) ? data.damagedComponents.join(', ') : data.damagedComponents,
        damaged_component_other: data.damagedComponentOther || null,
        description: `Damage reported for ${data.kitNumber}`,
        timestamp: new Date().toISOString()
      };

      const { data: moveInsertData, error: moveError } = await safeInsertMovement(movementPayload);
      if (moveError) throw moveError;

      loadData();
      setShowAddDamagedKit(false);
      alert('Damage report submitted');
    } catch (err) {
      console.error('Error reporting damage:', err);
      const message = err?.message || err?.msg || JSON.stringify(err);
      alert(`Failed to submit damage report. ${message}`);
    }
  };

  // Bulk Import Functions
  const parseFile = async (file) => {
    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (fileExtension === 'csv') {
        const PapaMod = await import('papaparse');
        const Papa = PapaMod?.default ?? PapaMod;
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
          });
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const xlsxMod = await import('xlsx');
        const XLSX = xlsxMod?.default ?? xlsxMod;
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              resolve(jsonData);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      } else {
        throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv');
      }
    } catch (error) {
      throw new Error(`Failed to parse file: ${error.message}`, { cause: error });
    }
  };

  const validateRow = (row, rowIndex) => {
    const errors = [];
    
    // Normalize column names (case-insensitive)
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[key.toLowerCase().trim()] = value;
    }

    const kitNumber = normalizedRow['kit number'] || normalizedRow['kitnumber'] || normalizedRow['kit#'];
    const kitType = normalizedRow['kit type'] || normalizedRow['kittype'] || normalizedRow['type'];
    const location = normalizedRow['location'];

    // Validate required fields
    if (!kitNumber || String(kitNumber).trim() === '') {
      errors.push(`Row ${rowIndex + 1}: Kit Number is required`);
    } else {
      // Check if kit number already exists
      if (kits.some(k => k.kitNumber === String(kitNumber).trim())) {
        errors.push(`Row ${rowIndex + 1}: Kit Number "${kitNumber}" already exists in inventory`);
      }
    }

    if (!kitType || String(kitType).trim() === '') {
      errors.push(`Row ${rowIndex + 1}: Kit Type is required`);
    } else if (!KIT_TYPES.includes(String(kitType).trim())) {
      errors.push(`Row ${rowIndex + 1}: Kit Type must be one of: ${KIT_TYPES.join(', ')}`);
    }

    if (!location || String(location).trim() === '') {
      errors.push(`Row ${rowIndex + 1}: Location is required`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: {
        kitNumber: String(kitNumber).trim(),
        type: String(kitType).trim(),
        location: String(location).trim()
      }
    };
  };

  const handleFileUpload = async (file) => {
    try {
      setBulkImportProgress(10);
      const parsedData = await parseFile(file);
      setBulkImportProgress(30);

      if (!parsedData || parsedData.length === 0) {
        alert('No data found in file');
        return;
      }

      // Validate all rows
      const validatedRows = parsedData.map((row, index) => ({
        ...row,
        validation: validateRow(row, index)
      }));

      setBulkImportProgress(50);
      setBulkImportFile(file);
      setBulkImportData(validatedRows);

      // Collect errors
      const allErrors = validatedRows
        .filter(row => !row.validation.isValid)
        .flatMap(row => row.validation.errors);

      setBulkImportErrors(allErrors);
      setBulkImportProgress(100);
    } catch (error) {
      alert(`Error parsing file: ${error.message}`);
      setBulkImportProgress(0);
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!bulkImportData || bulkImportData.length === 0) {
      alert('No data to import');
      return;
    }

    const validRows = bulkImportData.filter(row => row.validation.isValid);
    if (validRows.length === 0) return;

    try {
      setBulkImportProgress(10);
      const kitsToInsert = validRows.map(row => ({
        id: row.validation.data.kitNumber,
        kit_number: row.validation.data.kitNumber,
        type: row.validation.data.type,
        location: row.validation.data.location,
        status: 'in-stock',
        components: COMPONENTS.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {})
      }));

      const { error: kitError } = await supabase.from('kits').upsert(kitsToInsert);
      if (kitError) throw kitError;

      setBulkImportProgress(60);
      const movementsToInsert = validRows.map(row => ({
        type: 'kit-registered',
        kit_id: row.validation.data.kitNumber,
        description: `Kit ${row.validation.data.kitNumber} registered via bulk import`
      }));

      const { data: moveData, error: moveError } = await safeInsertMovement(movementsToInsert);
      if (moveError) throw moveError;

      setBulkImportResults({
        successCount: validRows.length,
        errorCount: bulkImportData.length - validRows.length
      });
      loadData();
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert('Bulk import failed. Some records may not have been saved.');
    } finally {
      // Keep results visible for a moment then reset
      setTimeout(() => setBulkImportProgress(0), 2000);
    }
  };

  const downloadTemplate = async () => {
    const template = [
      {
        'Kit Number': 'BR001',
        'Kit Type': 'BioRugged',
        'Location': 'Warehouse A - Shelf 1'
      },
      {
        'Kit Number': 'LX002',
        'Kit Type': 'Laxton',
        'Location': 'Warehouse B - Shelf 3'
      },
      {
        'Kit Number': 'ET003',
        'Kit Type': 'Emptech',
        'Location': 'Store'
      }
    ];

    const xlsxMod = await import('xlsx');
    const XLSX = xlsxMod?.default ?? xlsxMod;
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kits');
    XLSX.writeFile(wb, 'bulk_kit_template.xlsx');
  };

  // Bulk Distribute Functions
  const validateDistributeRow = (row, rowIndex, currentFileKitNumbers) => {
    const errors = [];
    
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[key.toLowerCase().trim()] = value;
    }

    const kitNumber = normalizedRow['kit number'] || normalizedRow['kitnumber'] || normalizedRow['kit#'];
    const partnerName = normalizedRow['partner name'] || normalizedRow['partner'] || normalizedRow['assigned to'];

    let validKit = null;

    if (!kitNumber || String(kitNumber).trim() === '') {
      errors.push(`Row ${rowIndex + 1}: Kit Number is required`);
    } else {
      const kitNumStr = String(kitNumber).trim();
      if (currentFileKitNumbers.has(kitNumStr)) {
        errors.push(`Row ${rowIndex + 1}: Duplicate Kit Number: ${kitNumStr} found in file`);
      } else {
        currentFileKitNumbers.add(kitNumStr);
        const kit = kits.find(k => k.kitNumber === kitNumStr);
        if (!kit) {
          errors.push(`Row ${rowIndex + 1}: Kit ${kitNumStr} not found in inventory`);
        } else if (kit.status !== 'in-stock') {
          errors.push(`Row ${rowIndex + 1}: Kit ${kitNumStr} is already distributed to ${kit.assignedTo || 'another partner'}`);
        } else {
          validKit = kit;
        }
      }
    }

    if (!partnerName || String(partnerName).trim() === '') {
      const displayKit = kitNumber ? String(kitNumber).trim() : `at Row ${rowIndex + 1}`;
      errors.push(`Row ${rowIndex + 1}: Partner Name is required for Kit ${displayKit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: {
        kitNumber: kitNumber ? String(kitNumber).trim() : '',
        partnerName: partnerName ? String(partnerName).trim() : '',
        kitId: validKit ? validKit.id : null
      }
    };
  };

  const handleDistributeFileUpload = async (file) => {
    try {
      setBulkDistributeProgress(10);
      const parsedData = await parseFile(file);
      setBulkDistributeProgress(30);

      if (!parsedData || parsedData.length === 0) {
        alert('No data found in file');
        return;
      }

      const currentFileKitNumbers = new Set();
      const validatedRows = parsedData.map((row, index) => ({
        ...row,
        validation: validateDistributeRow(row, index, currentFileKitNumbers)
      }));

      setBulkDistributeProgress(50);
      setBulkDistributeFile(file);
      setBulkDistributeData(validatedRows);

      const allErrors = validatedRows
        .filter(row => !row.validation.isValid)
        .flatMap(row => row.validation.errors);

      setBulkDistributeErrors(allErrors);
      setBulkDistributeProgress(100);
    } catch (error) {
      alert(`Error parsing file: ${error.message}`);
      setBulkDistributeProgress(0);
    }
  };

  const handleConfirmBulkDistribute = async () => {
    if (!bulkDistributeData || bulkDistributeData.length === 0) {
      alert('No data to distribute');
      return;
    }

    const validRows = bulkDistributeData.filter(row => row.validation.isValid);
    
    if (validRows.length === 0) {
      alert('No valid rows to distribute');
      return;
    }

    let errorCount = bulkDistributeData.length - validRows.length;

    try {
      setBulkDistributeProgress(10);

      // Update each kit record in Supabase (update per-kit because assigned_to differs)
      const updatePromises = validRows.map(row => {
        const kitId = row.validation.data.kitId;
        const partner = row.validation.data.partnerName;
        return supabase
          .from('kits')
          .update({
            status: 'distributed',
            assigned_to: partner,
            distributed_at: new Date().toISOString()
          })
          .eq('id', kitId);
      });

      const updateResults = await Promise.all(updatePromises);
      for (const res of updateResults) {
        if (res.error) throw res.error;
      }

      // Insert movement records for all distributions in one batch
      const movementsToInsert = validRows.map(row => ({
        type: 'distribution',
        kit_id: row.validation.data.kitId,
        partner: row.validation.data.partnerName,
        description: `Kit ${row.validation.data.kitNumber} distributed to ${row.validation.data.partnerName} (Bulk)`,
        timestamp: new Date().toISOString()
      }));

      const { data: moveData, error: moveError } = await safeInsertMovement(movementsToInsert);
      if (moveError) throw moveError;

      // Reload persisted data
      await loadData();

      setBulkDistributeResults({
        successCount: validRows.length,
        errorCount,
        totalRows: bulkDistributeData.length
      });
    } catch (error) {
      console.error('Bulk distribute failed:', error);
      alert('Bulk distribute failed. Some records may not have been saved.');
    } finally {
      setBulkDistributeProgress(0);
    }
  };

  const downloadDistributeTemplate = async () => {
    const template = [
      {
        'Kit Number': 'BR001',
        'Partner Name': 'Ethio Tele'
      },
      {
        'Kit Number': 'LX002',
        'Partner Name': 'Ethio Post'
      },
      {
        'Kit Number': 'ET003',
        'Partner Name': 'Safaricom'
      }
    ];

    const xlsxMod = await import('xlsx');
    const XLSX = xlsxMod?.default ?? xlsxMod;
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Distributions');
    XLSX.writeFile(wb, 'bulk_distribution_template.xlsx');
  };

  const downloadFailedDistributeRecords = async () => {
    const failedRows = bulkDistributeData
      .filter(row => !row.validation.isValid)
      .map(row => {
        // Find the original columns
        const newRow = { ...row };
        delete newRow.validation; // remove internal validation object
        newRow['Error Reason'] = row.validation.errors.join(' | ');
        return newRow;
      });

    if (failedRows.length === 0) return;

    const xlsxMod = await import('xlsx');
    const XLSX = xlsxMod?.default ?? xlsxMod;
    const ws = XLSX.utils.json_to_sheet(failedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed Records');
    XLSX.writeFile(wb, 'failed_distributions.xlsx');
  };

  // Stats calculations
  const stats = {
    totalKits: kits.length,
    inStock: kits.filter(k => k.status === 'in-stock').length,
    distributed: kits.filter(k => k.status === 'distributed').length,
    byType: {
      BioRugged: kits.filter(k => k.type === 'BioRugged').length,
      Laxton: kits.filter(k => k.type === 'Laxton').length,
      Emptech: kits.filter(k => k.type === 'Emptech').length
    },
    totalSpareParts: spareParts.reduce((acc, sp) => acc + sp.quantity, 0),
    lowStockSpares: spareParts.filter(sp => sp.quantity < 10).length
  };

  const getStatusColor = (status) => {
    return status === 'in-stock' ? 'text-green-400' : 'text-amber-400';
  };

  const getTypeColor = (type) => {
    const colors = {
      BioRugged: 'from-blue-600 to-blue-400',
      Laxton: 'from-purple-600 to-purple-400',
      Emptech: 'from-cyan-600 to-cyan-400'
    };
    return colors[type] || 'from-gray-600 to-gray-400';
  };

  const exportToExcel = (data, filename) => {
    if (!data || !data.length) {
      alert('No data to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const cell = row[header] === null || row[header] === undefined ? '' : row[header];
        return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportKits = (filteredKits) => {
    const data = filteredKits.map(k => ({
      'Kit Number': k.kitNumber,
      'Type': k.type,
      'Location': k.location,
      'Status': k.status,
      'Assigned To': k.assignedTo || '',
      'Registered Date': new Date(k.createdAt).toLocaleDateString()
    }));
    exportToExcel(data, 'Kits_Report');
  };

  const getFilteredSpareParts = () => {
    return spareParts.filter(sp => {
      const matchKit = sparePartsFilters.kitType === 'all' || sp.kitType === sparePartsFilters.kitType;
      const matchComp = sparePartsFilters.componentType === 'all' || sp.type === sparePartsFilters.componentType;
      return matchKit && matchComp;
    });
  };

  const handleExportSpareParts = () => {
    const filteredSpareParts = getFilteredSpareParts();
    const data = filteredSpareParts.map(sp => ({
      'Kit Type': sp.kitType,
      'Component Type': sp.type,
      'Quantity': sp.quantity,
      'Location': sp.location,
      'Status': sp.quantity < 5 ? 'Critical' : sp.quantity < 10 ? 'Low Stock' : 'Good',
      'Notes': sp.notes || '',
      'Last Added': new Date(sp.createdAt).toLocaleDateString()
    }));
    exportToExcel(data, 'Spare_Parts_Report');
  };

  const getFilteredActivityLog = () => {
    let filtered = movements.slice();
    
    if (activityLogFilters.sparePartOnly) {
      filtered = filtered.filter(m => m.type === 'spare-usage' || m.type === 'spare-registered');
    }
    
    if (activityLogFilters.partner !== 'all') {
      filtered = filtered.filter(m => m.partner === activityLogFilters.partner);
    }
    
    if (activityLogFilters.startDate || activityLogFilters.endDate) {
      const startDate = activityLogFilters.startDate ? new Date(activityLogFilters.startDate) : null;
      const endDate = activityLogFilters.endDate ? new Date(activityLogFilters.endDate) : null;
      
      filtered = filtered.filter(m => {
        const movementDate = new Date(m.timestamp);
        if (startDate && movementDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (movementDate > endOfDay) return false;
        }
        return true;
      });
    }
    return filtered.reverse();
  };

  const handleExportActivityLog = () => {
    const filteredMovements = getFilteredActivityLog();
    const data = filteredMovements.map(m => ({
      'Type': m.type,
      'Description': m.description,
      'Partner': m.partner || '',
      'Condition': m.condition || '',
      'Quantity': m.quantity || '',
      'Notes': m.notes || '',
      'Date': new Date(m.timestamp).toLocaleString()
    }));
    exportToExcel(data, 'Activity_Log_Report');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/idethiopia_logo-modified.png" alt="NID logo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
            <h1 className="text-3xl font-bold text-white mb-2">NIDP Inventory Access</h1>
            <p className="text-slate-400">Please sign in to manage NID kits</p>
          </div>

          {showSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Full name</label>
                <input
                  type="text"
                  placeholder="Kiru Belay"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  value={signUpForm.fullName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Email</label>
                <input
                  type="email"
                  placeholder="kiru@id.et"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-mono"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  value={signUpForm.password}
                  onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  value={signUpForm.confirmPassword}
                  onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              {signUpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {signUpError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={signUpLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-bold text-white shadow transition-all disabled:opacity-50"
                >
                  {signUpLoading ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSignUp(false); setSignUpError(null); }}
                  className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Username or Email</label>
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all font-mono"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-cyan-500 transition-all"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
              
              <div className="text-sm text-slate-400 text-center mt-2">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setShowSignUp(true); setSignUpError(null); }} className="text-cyan-300 font-bold underline">Create account</button>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">National ID Ethiopia</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <Package className="w-12 h-12 text-cyan-400 animate-spin" />
          </div>
          <p className="text-slate-300 text-lg font-light">Initializing Inventory System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col fixed h-full z-50">
        <div className="p-6 flex items-center gap-4 border-b border-slate-800">
          <img src="/idethiopia_logo-modified.png" alt="NID logo" className="w-12 h-12 rounded-lg object-contain" />
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              NID Inventory
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ethiopia</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Navigation</p>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Package },
            { id: 'all kits', label: 'All Kits', icon: FileUp },
            { id: 'spare parts', label: 'Spare Parts', icon: CheckCircle },
            { id: 'activity log', label: 'Activity Log', icon: RotateCcw }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === tab.id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
            >
              <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}

          <div className="pt-8 pb-4">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
            <div className="space-y-3">
              <button
                onClick={() => setShowAddKit(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-white transition-all duration-300 shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                <span>Register Kit</span>
              </button>
              <button
                onClick={() => setShowAddSparePart(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-semibold text-slate-300 hover:text-white transition-all duration-300 active:scale-[0.98]"
              >
                <Plus className="w-5 h-5 text-purple-400" />
                <span>Register Spare</span>
              </button>
              <button
                onClick={() => setShowAddDamagedKit(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-700 hover:border-red-500 rounded-xl font-semibold text-slate-300 hover:text-white transition-all duration-300 active:scale-[0.98]"
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>Add Damaged Kit</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-800/50 border border-slate-700 hover:border-green-500/50 rounded-xl text-[10px] font-bold text-slate-400 hover:text-green-400 transition-all active:scale-[0.95]"
                >
                  <Upload className="w-4 h-4" />
                  IMPORT
                </button>
                <button
                  onClick={() => setShowBulkDistribute(true)}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 rounded-xl text-[10px] font-bold text-slate-400 hover:text-amber-400 transition-all active:scale-[0.95]"
                >
                  <Send className="w-4 h-4" />
                  DISTRIBUTE
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-slate-300 border border-slate-700 shrink-0">
              {(profile?.full_name || user.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-200 truncate">{profile?.full_name || user.email.split('@')[0]}</p>
              <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest leading-none">{profile?.role || 'Staff'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-1 flex flex-col p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Kits', value: stats.totalKits, icon: '📦', color: 'from-slate-700' },
            { label: 'In Stock', value: stats.inStock, icon: '✓', color: 'from-green-700' },
            { label: 'Distributed', value: stats.distributed, icon: '→', color: 'from-amber-700' },
            { label: 'Spare Parts', value: stats.totalSpareParts, icon: '🔧', color: 'from-purple-700' },
            { label: 'Low Stock', value: stats.lowStockSpares, icon: '⚠️', color: 'from-red-700' }
          ].map((stat, idx) => (
            <div key={idx} className={`p-4 rounded-xl bg-gradient-to-br ${stat.color} to-transparent border border-white/5 hover:border-white/10 transition-all shadow-lg`}>
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Kits */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-cyan-400" />
                    Recent Kits
                  </h2>
                </div>
                
                {/* Kit Number Filter */}
                <div className="mb-4 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Filter by kit number..."
                    value={dashboardFilters.kitNumber}
                    onChange={(e) => setDashboardFilters({ kitNumber: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors text-sm"
                  />
                  {dashboardFilters.kitNumber && (
                    <button
                      onClick={() => setDashboardFilters({ kitNumber: '' })}
                      className="text-xs px-3 py-2 border border-slate-600 hover:border-red-500 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {kits.slice(-5).reverse().filter(kit => 
                    !dashboardFilters.kitNumber || 
                    kit.kitNumber.toLowerCase().includes(dashboardFilters.kitNumber.toLowerCase())
                  ).map((kit) => (
                    <div
                      key={kit.id}
                      className="p-4 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900/50 transition-all cursor-pointer group"
                      onClick={() => setExpandedKit(expandedKit === kit.id ? null : kit.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTypeColor(kit.type)}`}></div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{kit.kitNumber}</div>
                            <div className="text-xs text-slate-400">{kit.type}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold uppercase ${getStatusColor(kit.status)} px-3 py-1 rounded-full bg-slate-900/50`}>
                          {kit.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">{kit.location}</div>
                      {kit.assignedTo && <div className="text-xs text-amber-400">→ {kit.assignedTo}</div>}

                      {expandedKit === kit.id && (
                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            {COMPONENTS.map((comp) => (
                              <div key={comp} className="text-xs flex items-center gap-2 text-slate-300">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                {comp}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            {kit.status === 'in-stock' ? (
                              <button
                                onClick={() => { setShowDistribute(kit.id); setDistributeForm({ ...distributeForm, kitId: kit.id }); }}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded text-xs font-semibold transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Distribute
                              </button>
                            ) : (
                              <button
                                onClick={() => setReturnForm({ ...returnForm, kitId: kit.id })}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Return
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowEditKit(kit.id);
                                setEditKitForm({
                                  id: kit.id,
                                  kitNumber: kit.kitNumber,
                                  type: kit.type,
                                  location: kit.location,
                                  status: kit.status
                                });
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteKit(kit.id)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 rounded text-xs font-semibold text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              {/* Distribute Kit */}
              {showDistribute && (
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-amber-400" />
                    Distribute Kit
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Partner Name"
                      value={distributeForm.partner}
                      onChange={(e) => setDistributeForm({ ...distributeForm, partner: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                    />
                    <textarea
                      placeholder="Notes (optional)"
                      value={distributeForm.notes}
                      onChange={(e) => setDistributeForm({ ...distributeForm, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors text-sm"
                      rows="3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDistribute}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowDistribute(null)}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Return Kit */}
              {returnForm.kitId && (
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-green-400" />
                    Return Kit
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">Condition</label>
                      <select
                        value={returnForm.condition}
                        onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 outline-none transition-colors"
                      >
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </div>
                    <textarea
                      placeholder="Notes (optional)"
                      value={returnForm.notes}
                      onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors text-sm"
                      rows="3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReturn}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                      >
                        Process Return
                      </button>
                      <button
                        onClick={() => setReturnForm({ kitId: '', quantity: 1, condition: 'good', notes: '' })}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Kit Type Breakdown */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
                <h3 className="font-bold mb-4">Inventory Breakdown</h3>
                <div className="space-y-4">
                  {KIT_TYPES.map((type) => {
                    const count = stats.byType[type];
                    const percentage = stats.totalKits > 0 ? (count / stats.totalKits) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-semibold">{type}</span>
                          <span className="text-sm text-cyan-400">{count}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getTypeColor(type)} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Kits Tab */}
        {activeTab === 'all kits' && (() => {
          const assignedPartners = [...new Set(kits.map(k => k.assignedTo).filter(Boolean))].sort();
          const filteredKits = kits.filter(kit => {
            const matchesSearch =
              !filters.search ||
              kit.kitNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
              kit.location.toLowerCase().includes(filters.search.toLowerCase()) ||
              (kit.assignedTo || '').toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = filters.status === 'all' || kit.status === filters.status;
            const matchesType = filters.type === 'all' || kit.type === filters.type;
            const matchesPartner = filters.partner === 'all' || kit.assignedTo === filters.partner;
            return matchesSearch && matchesStatus && matchesType && matchesPartner;
          });

          return (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Search */}
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                      id="kit-search"
                      type="text"
                      placeholder="Kit #"
                      value={filters.search}
                      onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    id="filter-status"
                    value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-400 outline-none transition-colors"
                  >
                    <option value="all">All Locations</option>
                    <option value="in-stock">In Stock (Warehouse)</option>
                    <option value="distributed">Distributed (With Partner)</option>
                  </select>

                  {/* Type Filter */}
                  <select
                    id="filter-type"
                    value={filters.type}
                    onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-400 outline-none transition-colors"
                  >
                    <option value="all">All Types</option>
                    {KIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {/* Partner Filter */}
                  <select
                    id="filter-partner"
                    value={filters.partner}
                    onChange={e => setFilters(f => ({ ...f, partner: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-400 outline-none transition-colors"
                  >
                    <option value="all">All Partners</option>
                    {assignedPartners.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Result count + Clear */}
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs text-slate-400">
                      <span className="text-cyan-400 font-bold">{filteredKits.length}</span> / {kits.length} kits
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs px-3 py-1.5 border border-slate-600 hover:border-red-500 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        ✕ Clear
                      </button>
                    )}
                    <button
                      onClick={() => handleExportKits(filteredKits)}
                      className="flex items-center gap-2 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-green-900/20"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Kit #</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Assigned To</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKits.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          No kits match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredKits.map((kit) => (
                        <tr key={kit.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-cyan-400">{kit.kitNumber}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${getTypeColor(kit.type)} bg-opacity-20 text-white`}>
                              {kit.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{kit.location}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-bold uppercase ${getStatusColor(kit.status)} px-3 py-1 rounded-full bg-slate-900/50`}>
                              {kit.status === 'in-stock' ? '📦 In Stock' : '🚚 Distributed'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{kit.assignedTo || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {kit.status === 'in-stock' ? (
                                <button
                                  onClick={() => { setShowDistribute(kit.id); setDistributeForm({ ...distributeForm, kitId: kit.id }); }}
                                  className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded transition-colors"
                                >
                                  Distribute
                                </button>
                              ) : (
                                <button
                                  onClick={() => setReturnForm({ ...returnForm, kitId: kit.id })}
                                  className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded transition-colors"
                                >
                                  Return
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowEditKit(kit.id);
                                  setEditKitForm({
                                    id: kit.id,
                                    kitNumber: kit.kitNumber,
                                    type: kit.type,
                                    location: kit.location,
                                    status: kit.status
                                  });
                                }}
                                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteKit(kit.id)}
                                className="text-xs px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Spare Parts Tab */}
        {activeTab === 'spare parts' && (() => {
          const filteredSpareParts = getFilteredSpareParts();
          return (
          <div className="space-y-4">
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400">
                  <Plus className="w-5 h-5" />
                  Spare Parts Inventory
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-slate-400">
                    Showing: <span className="text-white font-bold">{filteredSpareParts.length}</span> / {stats.totalSpareParts} items
                  </div>
                  {hasActiveSparePartsFilters && (
                    <button
                      onClick={clearSparePartsFilters}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={handleExportSpareParts}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-green-900/20"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                </div>
              </div>

              <div className="flex gap-4 items-end border-t border-slate-700/50 pt-4 mt-2">
                <div className="flex-1 max-w-xs">
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Kit Type</label>
                  <select
                    value={sparePartsFilters.kitType}
                    onChange={e => setSparePartsFilters({ ...sparePartsFilters, kitType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-400 outline-none transition-colors"
                  >
                    <option value="all">All Kit Types</option>
                    {KIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1 max-w-xs">
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Component Type</label>
                  <select
                    value={sparePartsFilters.componentType}
                    onChange={e => setSparePartsFilters({ ...sparePartsFilters, componentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-400 outline-none transition-colors"
                  >
                    <option value="all">All Component Types</option>
                    {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Kit Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Component Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Stock Level</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Location</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Last Added</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpareParts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 italic">
                        No spare parts match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSpareParts.map((spare) => (
                      <tr key={spare.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-cyan-400">{spare.kitType}</td>
                        <td className="py-3 px-4 font-semibold">{spare.type}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{spare.quantity}</span>
                            <span className="text-xs text-slate-500">units</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{spare.location}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            spare.quantity < 5 ? 'bg-red-500/20 text-red-400' :
                            spare.quantity < 10 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {spare.quantity < 5 ? 'Critical' : spare.quantity < 10 ? 'Low Stock' : 'Good'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(spare.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowUseSparePart(spare.id);
                                setUseSparePartForm({ sparePartId: spare.id, kitId: '', partner: '', notes: '', quantity: 1 });
                              }}
                              className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Use Part
                            </button>
                            <button
                              onClick={() => {
                                setShowEditSparePart(spare.id);
                                setEditSparePartForm({
                                  id: spare.id,
                                  type: spare.type,
                                  kitType: spare.kitType,
                                  quantity: spare.quantity,
                                  location: spare.location,
                                  notes: spare.notes
                                });
                              }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Edit
                            </button>
                              <button
                                onClick={() => handleDeleteSparePart(spare.id)}
                                className="px-2 py-1 bg-red-700/10 hover:bg-red-700/20 text-red-400 rounded text-[10px] font-bold uppercase transition-colors"
                              >
                                Delete
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Activity Log Tab */}
        {activeTab === 'activity log' && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Filter Activity Log</h3>
                <div className="flex items-center gap-3">
                  {hasActiveActivityLogFilters && (
                    <button
                      onClick={clearActivityLogFilters}
                      className="px-3 py-1 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={handleExportActivityLog}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-green-900/20"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Partner</label>
                  <select
                    value={activityLogFilters.partner}
                    onChange={(e) => setActivityLogFilters({ ...activityLogFilters, partner: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-purple-400 outline-none transition-colors"
                  >
                    <option value="all">All Partners</option>
                    {movements
                      .filter(m => m.partner)
                      .map(m => m.partner)
                      .filter((p, i, arr) => arr.indexOf(p) === i)
                      .sort()
                      .map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">From Date</label>
                  <input
                    type="date"
                    value={activityLogFilters.startDate}
                    onChange={(e) => setActivityLogFilters({ ...activityLogFilters, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-purple-400 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">To Date</label>
                  <input
                    type="date"
                    value={activityLogFilters.endDate}
                    onChange={(e) => setActivityLogFilters({ ...activityLogFilters, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-purple-400 outline-none transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm cursor-pointer hover:bg-slate-700 transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={activityLogFilters.sparePartOnly}
                      onChange={(e) => setActivityLogFilters({ ...activityLogFilters, sparePartOnly: e.target.checked })}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Spare Parts Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <div className="mb-6 flex justify-end">
                <SparePartsDashboard spareParts={spareParts} movements={movements} />
              </div>
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const filtered = getFilteredActivityLog();
                  
                  if (filtered.length === 0) {
                    return <p className="text-slate-400 text-center py-8">No activity found matching the filters</p>;
                  }
                  
                  return filtered.map((movement) => (
                    <div key={movement.id} className="p-4 rounded-lg border border-slate-700 bg-slate-900/30 flex items-start gap-3">
                      <div className="mt-1">
                        {movement.type === 'kit-registered' && <Package className="w-5 h-5 text-blue-400" />}
                        {movement.type === 'distribution' && <Send className="w-5 h-5 text-amber-400" />}
                        {movement.type === 'return' && <RotateCcw className="w-5 h-5 text-green-400" />}
                        {movement.type === 'spare-usage' && <AlertCircle className="w-5 h-5 text-purple-400" />}
                        {movement.type === 'spare-registered' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{movement.description}</div>
                        {movement.partner && <div className="text-sm text-slate-400">Partner: {movement.partner}</div>}
                        {movement.condition && <div className="text-sm text-slate-400">Condition: {movement.condition}</div>}
                        {movement.quantity && <div className="text-sm text-slate-400">Quantity: {movement.quantity}</div>}
                        {movement.notes && <div className="text-sm text-slate-400 italic">{movement.notes}</div>}
                        <div className="text-xs text-slate-500 mt-1">{new Date(movement.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Kit Modal */}
      {showAddKit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">Register New Kit</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Number</label>
                <input
                  type="text"
                  placeholder="BREBA0001"
                  value={newKit.kitNumber}
                  onChange={(e) => setNewKit({ ...newKit, kitNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Type</label>
                <select
                  value={newKit.type}
                  onChange={(e) => setNewKit({ ...newKit, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-400 outline-none transition-colors"
                >
                  {KIT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Location</label>
                <input
                  type="text"
                  placeholder="Store"
                  value={newKit.location}
                  onChange={(e) => setNewKit({ ...newKit, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleAddKit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all duration-300"
                >
                  Register Kit
                </button>
                <button
                  onClick={() => setShowAddKit(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Damaged Kit Modal */}
      {showAddDamagedKit && (
        <AddDamagedKit
          onClose={() => setShowAddDamagedKit(false)}
          onSubmit={handleReportDamagedKit}
        />
      )}

      {/* Edit Kit Modal */}
      {showEditKit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">Edit Kit</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Number</label>
                <input
                  type="text"
                  placeholder="BREBA0001"
                  value={editKitForm.kitNumber}
                  onChange={(e) => setEditKitForm({ ...editKitForm, kitNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Type</label>
                <select
                  value={editKitForm.type}
                  onChange={(e) => setEditKitForm({ ...editKitForm, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-400 outline-none transition-colors"
                >
                  {KIT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Location</label>
                <input
                  type="text"
                  placeholder="Store"
                  value={editKitForm.location}
                  onChange={(e) => setEditKitForm({ ...editKitForm, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Status</label>
                <select
                  value={editKitForm.status}
                  onChange={(e) => setEditKitForm({ ...editKitForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-400 outline-none transition-colors"
                >
                  <option value="in-stock">In Stock</option>
                  <option value="distributed">Distributed</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleEditKit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all duration-300"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditKit(null)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Use Spare Part Modal */}
      {showUseSparePart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-purple-400">Use Spare Part</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Allocate to Kit</label>
                <input
                  type="text"
                  placeholder="Enter kit identifier"
                  value={useSparePartForm.kitId}
                  onChange={(e) => setUseSparePartForm({ ...useSparePartForm, kitId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Required Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={useSparePartForm.quantity}
                  onChange={(e) => setUseSparePartForm({ ...useSparePartForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Allocate to Partner</label>
                <select
                  value={useSparePartForm.partner || ''}
                  onChange={(e) => setUseSparePartForm({ ...useSparePartForm, partner: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-400 outline-none transition-colors"
                >
                  <option value="">Select Partner</option>
                  <option value="Ethio Tele">Ethio Tele</option>
                  <option value="Ethio Post">Ethio Post</option>
                  <option value="Safaricom">Safaricom</option>
                  <option value="CBE Bank">CBE Bank</option>
                  <option value="O-tech">O-tech</option>
                  <option value="ABH">ABH</option>
                  <option value="Blue Spark">Blue Spark</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Usage Notes</label>
                <textarea
                  placeholder="Reason for replacement..."
                  value={useSparePartForm.notes}
                  onChange={(e) => setUseSparePartForm({ ...useSparePartForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors text-sm"
                  rows="3"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleUseSparePart}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all duration-300"
                >
                  Confirm Usage
                </button>
                <button
                  onClick={() => setShowUseSparePart(null)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Spare Part Modal */}
      {showAddSparePart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 text-purple-400">Register Spare Part</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Type</label>
                <select
                  value={newSparePart.kitType}
                  onChange={(e) => setNewSparePart({ ...newSparePart, kitType: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-400 outline-none transition-colors"
                >
                  {KIT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Component Type</label>
                <select
                  value={newSparePart.type}
                  onChange={(e) => setNewSparePart({ ...newSparePart, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-400 outline-none transition-colors"
                >
                  {COMPONENTS.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newSparePart.quantity}
                  onChange={(e) => setNewSparePart({ ...newSparePart, quantity: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Storage Location</label>
                <input
                  type="text"
                  placeholder="store"
                  value={newSparePart.location}
                  onChange={(e) => setNewSparePart({ ...newSparePart, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Notes</label>
                <textarea
                  placeholder="Additional details..."
                  value={newSparePart.notes}
                  onChange={(e) => setNewSparePart({ ...newSparePart, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 outline-none transition-colors text-sm"
                  rows="2"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleRegisterSparePart}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-purple-900/20"
                >
                  Confirm Registration
                </button>
                <button
                  onClick={() => setShowAddSparePart(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Spare Part Modal */}
      {showEditSparePart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 text-slate-300">Edit Spare Part</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Kit Type</label>
                <select
                  value={editSparePartForm.kitType}
                  onChange={(e) => setEditSparePartForm({ ...editSparePartForm, kitType: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-slate-400 outline-none transition-colors"
                >
                  {KIT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Component Type</label>
                <select
                  value={editSparePartForm.type}
                  onChange={(e) => setEditSparePartForm({ ...editSparePartForm, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-slate-400 outline-none transition-colors"
                >
                  {COMPONENTS.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editSparePartForm.quantity}
                  onChange={(e) => setEditSparePartForm({ ...editSparePartForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-slate-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g., Bin B-12"
                  value={editSparePartForm.location}
                  onChange={(e) => setEditSparePartForm({ ...editSparePartForm, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-slate-400 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Notes</label>
                <textarea
                  placeholder="Additional details..."
                  value={editSparePartForm.notes}
                  onChange={(e) => setEditSparePartForm({ ...editSparePartForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-slate-400 outline-none transition-colors text-sm"
                  rows="2"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleEditSparePart}
                  className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-slate-900/20"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditSparePart(null)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Bulk Kit Import
              </h2>
              <button
                onClick={() => {
                  setShowBulkImport(false);
                  setBulkImportFile(null);
                  setBulkImportData([]);
                  setBulkImportErrors([]);
                  setBulkImportResults(null);
                  setBulkImportProgress(0);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Show Results */}
            {bulkImportResults ? (
              <div className="space-y-4">
                <div className="p-6 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">✓</div>
                  <h3 className="text-xl font-bold text-green-400 mb-4">Import Complete!</h3>
                  <div className="space-y-2 text-slate-300">
                    <p>✓ <span className="font-semibold">{bulkImportResults.successCount}</span> kits successfully registered</p>
                    {bulkImportResults.errorCount > 0 && (
                      <p>✗ <span className="font-semibold">{bulkImportResults.errorCount}</span> rows skipped due to errors</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportFile(null);
                    setBulkImportData([]);
                    setBulkImportErrors([]);
                    setBulkImportResults(null);
                    setBulkImportProgress(0);
                  }}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            ) : bulkImportData.length > 0 ? (
              <div className="space-y-4">
                {/* Errors Section */}
                {bulkImportErrors.length > 0 && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="font-bold text-red-400">{bulkImportErrors.length} Validation Error(s)</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {bulkImportErrors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-300">• {error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                <div>
                  <h3 className="font-bold text-slate-300 mb-3">Data Preview</h3>
                  <div className="max-h-64 overflow-x-auto bg-slate-800/50 rounded-lg border border-slate-700 p-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-2 py-2 text-left text-slate-400">Row</th>
                          <th className="px-2 py-2 text-left text-slate-400">Kit Number</th>
                          <th className="px-2 py-2 text-left text-slate-400">Kit Type</th>
                          <th className="px-2 py-2 text-left text-slate-400">Location</th>
                          <th className="px-2 py-2 text-left text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkImportData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1 text-slate-300">{row.validation.data.kitNumber}</td>
                            <td className="px-2 py-1 text-slate-300">{row.validation.data.type}</td>
                            <td className="px-2 py-1 text-slate-300">{row.validation.data.location}</td>
                            <td className="px-2 py-1">
                              {row.validation.isValid ? (
                                <span className="text-green-400 font-bold">✓ Valid</span>
                              ) : (
                                <span className="text-red-400 font-bold">✗ Invalid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-sm text-blue-300">
                  <strong>Note:</strong> Only valid rows will be imported. Invalid rows will be skipped.
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmBulkImport}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirm Import
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkImport(false);
                      setBulkImportFile(null);
                      setBulkImportData([]);
                      setBulkImportErrors([]);
                      setBulkImportProgress(0);
                    }}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Upload Section */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-300">Select File</label>
                  <div
                    className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg p-8 text-center transition-colors cursor-pointer bg-slate-800/30"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleFileUpload(files[0]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="bulk-import-file"
                    />
                    <label htmlFor="bulk-import-file" className="cursor-pointer block">
                      <FileUp className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                      <div className="text-lg font-semibold text-cyan-400 mb-1">
                        Click to upload or drag and drop
                      </div>
                      <div className="text-sm text-slate-400">
                        .xlsx, .xls, or .csv files
                      </div>
                    </label>
                  </div>
                </div>

                {/* Progress */}
                {bulkImportProgress > 0 && bulkImportProgress < 100 && (
                  <div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                        style={{ width: `${bulkImportProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{bulkImportProgress}% Processing...</p>
                  </div>
                )}

                {/* Template Section */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="text-sm text-slate-400 mb-3">
                    Need help formatting your file? Download a template to get started.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400 space-y-2">
                  <p className="font-bold text-slate-300">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>File must contain columns: "Kit Number", "Kit Type", "Location"</li>
                    <li>Kit Type must be: BioRugged, Laxton, or Emptech</li>
                    <li>All fields are required</li>
                    <li>Kit Numbers must be unique</li>
                    <li>Column names are case-insensitive</li>
                  </ul>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportFile(null);
                    setBulkImportData([]);
                    setBulkImportErrors([]);
                    setBulkImportProgress(0);
                  }}
                  className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Distribute Modal */}
      {showBulkDistribute && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                <Send className="w-6 h-6" />
                Bulk Kit Distribution
              </h2>
              <button
                onClick={() => {
                  setShowBulkDistribute(false);
                  setBulkDistributeFile(null);
                  setBulkDistributeData([]);
                  setBulkDistributeErrors([]);
                  setBulkDistributeResults(null);
                  setBulkDistributeProgress(0);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Show Results */}
            {bulkDistributeResults ? (
              <div className="space-y-4">
                <div className="p-6 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">✓</div>
                  <h3 className="text-xl font-bold text-green-400 mb-4">Distribution Complete!</h3>
                  <div className="space-y-2 text-slate-300">
                    <p>✓ <span className="font-semibold">{bulkDistributeResults.successCount}</span> kits successfully distributed</p>
                    {bulkDistributeResults.errorCount > 0 && (
                      <p className="text-red-400">✗ <span className="font-semibold">{bulkDistributeResults.errorCount}</span> rows skipped due to errors</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {bulkDistributeResults.errorCount > 0 && (
                    <button
                      onClick={downloadFailedDistributeRecords}
                      className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-amber-400"
                    >
                      <Download className="w-5 h-5" />
                      Download Failed Records
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowBulkDistribute(false);
                      setBulkDistributeFile(null);
                      setBulkDistributeData([]);
                      setBulkDistributeErrors([]);
                      setBulkDistributeResults(null);
                      setBulkDistributeProgress(0);
                    }}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : bulkDistributeData.length > 0 ? (
              <div className="space-y-4">
                {/* Errors Section */}
                {bulkDistributeErrors.length > 0 && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="font-bold text-red-400">{bulkDistributeErrors.length} Validation Error(s)</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {bulkDistributeErrors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-300">• {error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                <div>
                  <h3 className="font-bold text-slate-300 mb-3">Data Preview</h3>
                  <div className="max-h-64 overflow-x-auto bg-slate-800/50 rounded-lg border border-slate-700 p-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-2 py-2 text-left text-slate-400">Row</th>
                          <th className="px-2 py-2 text-left text-slate-400">Kit Number</th>
                          <th className="px-2 py-2 text-left text-slate-400">Partner Name</th>
                          <th className="px-2 py-2 text-left text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkDistributeData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1 text-slate-300">{row.validation.data.kitNumber}</td>
                            <td className="px-2 py-1 text-slate-300">{row.validation.data.partnerName}</td>
                            <td className="px-2 py-1">
                              {row.validation.isValid ? (
                                <span className="text-green-400 font-bold">✓ Valid</span>
                              ) : (
                                <span className="text-red-400 font-bold">✗ Invalid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-sm text-blue-300">
                  <strong>Note:</strong> Only valid rows will be distributed. Invalid rows will be skipped.
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmBulkDistribute}
                    className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Confirm Distribution
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkDistribute(false);
                      setBulkDistributeFile(null);
                      setBulkDistributeData([]);
                      setBulkDistributeErrors([]);
                      setBulkDistributeProgress(0);
                    }}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Upload Section */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-300">Select File</label>
                  <div
                    className="border-2 border-dashed border-slate-600 hover:border-amber-500 rounded-lg p-8 text-center transition-colors cursor-pointer bg-slate-800/30"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleDistributeFileUpload(files[0]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleDistributeFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="bulk-distribute-file"
                    />
                    <label htmlFor="bulk-distribute-file" className="cursor-pointer block">
                      <FileUp className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                      <div className="text-lg font-semibold text-amber-400 mb-1">
                        Click to upload or drag and drop
                      </div>
                      <div className="text-sm text-slate-400">
                        .xlsx, .xls, or .csv files
                      </div>
                    </label>
                  </div>
                </div>

                {/* Progress */}
                {bulkDistributeProgress > 0 && bulkDistributeProgress < 100 && (
                  <div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                        style={{ width: `${bulkDistributeProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{bulkDistributeProgress}% Processing...</p>
                  </div>
                )}

                {/* Template Section */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="text-sm text-slate-400 mb-3">
                    Need help formatting your file? Download a template to get started.
                  </p>
                  <button
                    onClick={downloadDistributeTemplate}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400 space-y-2">
                  <p className="font-bold text-slate-300">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>File must contain columns: "Kit Number" and "Partner Name"</li>
                    <li>Both fields are required</li>
                    <li>Kit Numbers must exist and be currently "in-stock"</li>
                    <li>Column names are case-insensitive</li>
                  </ul>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowBulkDistribute(false);
                    setBulkDistributeFile(null);
                    setBulkDistributeData([]);
                    setBulkDistributeErrors([]);
                    setBulkDistributeProgress(0);
                  }}
                  className="flex-1 w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySystem;