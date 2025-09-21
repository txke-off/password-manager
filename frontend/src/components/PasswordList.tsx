import React, { useState, useEffect } from "react";
import type { Password } from "./Dashboard";
import { decryptWithKey } from "../crypto";
import { useEncryption } from "../EncryptionContext";
import "../index.css";

interface PasswordListProps {
  passwords: Password[];
  onEdit: (password: Password) => void;
  onDelete: (id: number) => void;
}

const PasswordList: React.FC<PasswordListProps> = ({
  passwords,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasswords, setShowPasswords] = useState<{
    [key: number]: boolean;
  }>({});
  const [decrypted, setDecrypted] = useState<Record<number, string>>({});
  const { key } = useEncryption();

  useEffect(() => {
    if (!key || passwords.length === 0) return;

    const decryptAll = async () => {
      const map: Record<number, string> = {};
      for (const p of passwords) {
        try {
          const plain = await decryptWithKey(
            key,
            p.encrypted_password,
            (p as any).iv
          );
          map[p.id] = plain;
        } catch {
          map[p.id] = "Error: wrong master password";
        }
      }
      setDecrypted(map);
    };

    decryptAll();
  }, [passwords, key]);

  const filteredPasswords = passwords.filter(
    (password) =>
      password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      password.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      password.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (passwords.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-xl mb-4">No passwords saved yet</div>
        <div className="text-gray-400">Click "Add Password" to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search passwords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPasswords.map((password) => (
          <div
            key={password.id}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200 break-words overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {password.title}
              </h3>
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={() =>
                    onEdit({
                      ...password,
                      decrypted: decrypted[password.id] || "",
                    })
                  }
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(password.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {password.username && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900 truncate flex-1">
                      {password.username}
                    </span>
                    <button
                      onClick={() => copyToClipboard(password.username)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900 truncate flex-1">
                    {showPasswords[password.id]
                      ? decrypted[password.id]
                      : "••••••••"}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(password.id)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showPasswords[password.id] ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() =>
                      copyToClipboard(decrypted[password.id] || "")
                    }
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {password.url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <div className="flex items-center space-x-2">
                    <a
                      href={
                        password.url.startsWith("http")
                          ? password.url
                          : `https://${password.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 truncate flex-1"
                    >
                      {password.url}
                    </a>
                    <button
                      onClick={() => copyToClipboard(password.url)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {password.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-sm text-gray-600 truncate">
                    {password.notes}
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Created: {formatDate(password.created_at)}
                {password.updated_at !== password.created_at && (
                  <span className="ml-2">
                    • Updated: {formatDate(password.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPasswords.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No passwords found matching "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordList;
