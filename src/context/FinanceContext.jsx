import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const FinanceContext = createContext();

const API_URL = 'http://localhost:3001/api';

export const FinanceProvider = ({ children }) => {
    const [incomes, setIncomes] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({});

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pRes, iRes, eRes, cRes, sRes] = await Promise.all([
                    axios.get(`${API_URL}/platforms`),
                    axios.get(`${API_URL}/incomes`),
                    axios.get(`${API_URL}/expenses`),
                    axios.get(`${API_URL}/categories`),
                    axios.get(`${API_URL}/settings`)
                ]);
                setPlatforms(pRes.data);
                setIncomes(iRes.data);
                setExpenses(eRes.data);
                setCategories(cRes.data);
                setSettings(sRes.data);
            } catch (err) {
                console.error('Error fetching data:', err);
                // Optionally handle 401s here if we want to force logout, 
                // but AuthContext should likely handle that if we verified user first.
            }
        };
        fetchData();
    }, []);

    const addIncome = async (income) => {
        try {
            const res = await axios.post(`${API_URL}/incomes`, income);
            setIncomes(prev => [...prev, res.data]);
        } catch (err) {
            console.error('Error adding income:', err);
        }
    };

    const deleteIncome = async (id) => {
        try {
            await axios.delete(`${API_URL}/incomes/${id}`);
            setIncomes(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            console.error('Error deleting income:', err);
        }
    };

    const updateIncome = async (id, updatedIncome) => {
        try {
            const res = await axios.put(`${API_URL}/incomes/${id}`, updatedIncome);
            setIncomes(prev => prev.map(i => i.id === id ? res.data : i));
        } catch (err) {
            console.error('Error updating income:', err);
        }
    };

    const addExpense = async (expense) => {
        try {
            const res = await axios.post(`${API_URL}/expenses`, expense);
            setExpenses(prev => [...prev, res.data]);
        } catch (err) {
            console.error('Error adding expense:', err);
        }
    };

    const deleteExpense = async (id) => {
        try {
            await axios.delete(`${API_URL}/expenses/${id}`);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting expense:', err);
        }
    };

    const updateExpense = async (id, updatedExpense) => {
        try {
            const res = await axios.put(`${API_URL}/expenses/${id}`, updatedExpense);
            setExpenses(prev => prev.map(e => e.id === id ? res.data : e));
        } catch (err) {
            console.error('Error updating expense:', err);
        }
    };

    const addPlatform = async (platform) => {
        try {
            const res = await axios.post(`${API_URL}/platforms`, platform);
            setPlatforms(prev => [...prev, res.data]);
        } catch (err) {
            console.error('Error adding platform:', err);
        }
    };

    const deletePlatform = async (id) => {
        try {
            await axios.delete(`${API_URL}/platforms/${id}`);
            setPlatforms(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting platform:', err);
        }
    };

    const updatePlatform = async (id, updatedPlatform) => {
        try {
            const res = await axios.put(`${API_URL}/platforms/${id}`, updatedPlatform);
            setPlatforms(prev => prev.map(p => p.id === id ? res.data : p));
        } catch (err) {
            console.error('Error updating platform:', err);
        }
    };

    const addCategory = async (category) => {
        try {
            const res = await axios.post(`${API_URL}/categories`, category);
            setCategories(prev => [...prev, res.data]);
        } catch (err) {
            console.error('Error adding category:', err);
        }
    };

    const deleteCategory = async (id) => {
        try {
            await axios.delete(`${API_URL}/categories/${id}`);
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            await axios.put(`${API_URL}/admin/settings`, newSettings);
            setSettings(prev => ({ ...prev, ...newSettings }));
        } catch (err) {
            console.error('Error updating settings:', err);
            throw err;
        }
    };

    return (
        <FinanceContext.Provider value={{
            incomes, addIncome, deleteIncome, updateIncome,
            expenses, addExpense, deleteExpense, updateExpense,
            platforms, addPlatform, deletePlatform, updatePlatform,
            categories, addCategory, deleteCategory,
            settings, updateSettings
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);
