import { createContext, useState, useEffect, useContext } from 'react';

const FinanceContext = createContext();

const API_URL = 'http://localhost:3001/api';

export const FinanceProvider = ({ children }) => {
    const [incomes, setIncomes] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [platforms, setPlatforms] = useState([]);

    // Fetch initial data
    useEffect(() => {
        fetch(`${API_URL}/platforms`)
            .then(res => res.json())
            .then(data => setPlatforms(data))
            .catch(err => console.error('Error fetching platforms:', err));

        fetch(`${API_URL}/incomes`)
            .then(res => res.json())
            .then(data => setIncomes(data))
            .catch(err => console.error('Error fetching incomes:', err));

        fetch(`${API_URL}/expenses`)
            .then(res => res.json())
            .then(data => setExpenses(data))
            .catch(err => console.error('Error fetching expenses:', err));
    }, []);

    const addIncome = (income) => {
        fetch(`${API_URL}/incomes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(income)
        })
            .then(res => res.json())
            .then(newIncome => setIncomes(prev => [...prev, newIncome]))
            .catch(err => console.error('Error adding income:', err));
    };

    const deleteIncome = (id) => {
        fetch(`${API_URL}/incomes/${id}`, { method: 'DELETE' })
            .then(() => setIncomes(prev => prev.filter(i => i.id !== id)))
            .catch(err => console.error('Error deleting income:', err));
    };

    const updateIncome = (id, updatedIncome) => {
        fetch(`${API_URL}/incomes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedIncome)
        })
            .then(res => res.json())
            .then(data => {
                setIncomes(prev => prev.map(i => i.id === id ? data : i));
            })
            .catch(err => console.error('Error updating income:', err));
    };

    const addExpense = (expense) => {
        fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        })
            .then(res => res.json())
            .then(newExpense => setExpenses(prev => [...prev, newExpense]))
            .catch(err => console.error('Error adding expense:', err));
    };

    const deleteExpense = (id) => {
        fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' })
            .then(() => setExpenses(prev => prev.filter(e => e.id !== id)))
            .catch(err => console.error('Error deleting expense:', err));
    };

    const updateExpense = (id, updatedExpense) => {
        fetch(`${API_URL}/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedExpense)
        })
            .then(res => res.json())
            .then(data => {
                setExpenses(prev => prev.map(e => e.id === id ? data : e));
            })
            .catch(err => console.error('Error updating expense:', err));
    };

    const addPlatform = (platform) => {
        fetch(`${API_URL}/platforms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(platform)
        })
            .then(res => res.json())
            .then(newPlatform => setPlatforms(prev => [...prev, newPlatform]))
            .catch(err => console.error('Error adding platform:', err));
    };

    const deletePlatform = (id) => {
        fetch(`${API_URL}/platforms/${id}`, { method: 'DELETE' })
            .then(() => setPlatforms(prev => prev.filter(p => p.id !== id)))
            .catch(err => console.error('Error deleting platform:', err));
    };

    const updatePlatform = (id, updatedPlatform) => {
        fetch(`${API_URL}/platforms/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPlatform)
        })
            .then(res => res.json())
            .then(data => {
                setPlatforms(prev => prev.map(p => p.id === id ? data : p));
            })
            .catch(err => console.error('Error updating platform:', err));
    };

    return (
        <FinanceContext.Provider value={{
            incomes, addIncome, deleteIncome, updateIncome,
            expenses, addExpense, deleteExpense, updateExpense,
            platforms, addPlatform, deletePlatform, updatePlatform
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);
