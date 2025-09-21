import React, { useState } from "react";
import { useEncryption } from "../EncryptionContext";

interface UnlockScreenProps {
  onUnlock: () => void;
}

const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock }) => {
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setKeyFromPassword } = useEncryption();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No active session, please relogin.");
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Could not get user data.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const encryptionSalt = data.encryption_salt;

      if (!encryptionSalt) {
        setError("Server encryption salt error.");
        setLoading(false);
        return;
      }

      await setKeyFromPassword(masterPassword, encryptionSalt);
      onUnlock();
    } catch (err) {
      console.error(err);
      setError("Error while unlocking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Unlock Vault
        </h2>
        <p className="text-gray-600 text-sm text-center mb-6">
          Enter your master password to unlock the vault.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label
              htmlFor="masterPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Master Password
            </label>
            <input
              id="masterPassword"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter master password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UnlockScreen;
