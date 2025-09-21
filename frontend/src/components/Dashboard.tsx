import React, { useState, useEffect } from "react";
import PasswordList from "./PasswordList";
import PasswordForm from "./PasswordForm";
import PasswordGenerator from "./PasswordGenerator";
import UnlockScreen from "./UnlockScreen";
import { useEncryption } from "../EncryptionContext";
import "../index.css";

interface DashboardProps {
  onLogout: () => void;
}

export interface Password {
  id: number;
  title: string;
  username: string;
  encrypted_password: string;
  iv?: string;
  decrypted?: string;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { key } = useEncryption()

  if (!key) {
    return <UnlockScreen onUnlock={() => {}} />;
  }
  
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPasswords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/passwords", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPasswords(data);
      }
    } catch (error) {
      console.error("Error fetching passwords:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords();
  }, []);

  const handlePasswordSaved = () => {
    fetchPasswords();
    setShowAddForm(false);
    setEditingPassword(null);
  };

  const handlePasswordDeleted = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8000/passwords/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchPasswords();
      }
    } catch (error) {
      console.error("Error deleting password:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Password Manager</h1>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => setShowGenerator(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Generate Password
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Password
          </button>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center">
          <div className="text-xl">Loading passwords...</div>
        </div>
      ) : (
        <PasswordList
          passwords={passwords}
          onEdit={setEditingPassword}
          onDelete={handlePasswordDeleted}
        />
      )}

      {(showAddForm || editingPassword) && (
        <PasswordForm
          password={editingPassword}
          onSave={handlePasswordSaved}
          onCancel={() => {
            setShowAddForm(false);
            setEditingPassword(null);
          }}
        />
      )}

      {showGenerator && (
        <PasswordGenerator onClose={() => setShowGenerator(false)} />
      )}
    </div>
  );
};

export default Dashboard;
