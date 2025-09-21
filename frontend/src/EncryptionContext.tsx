import React, { createContext, useState, useContext } from "react";
import { deriveKeyPBKDF2 } from "./crypto";

interface EncryptionContextType {
  key: CryptoKey | null;
  setKeyFromPassword: (password: string, salt: string) => Promise<void>;
  clearKey: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

export const EncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [key, setKey] = useState<CryptoKey | null>(null);

  const setKeyFromPassword = async (password: string, salt: string) => {
    const k = await deriveKeyPBKDF2(password, salt);
    setKey(k);
  };

  const clearKey = () => setKey(null);

  return (
    <EncryptionContext.Provider value={{ key, setKeyFromPassword, clearKey }}>
      {children}
    </EncryptionContext.Provider>
  );
};

export const useEncryption = () => {
  const ctx = useContext(EncryptionContext);
  if (!ctx) throw new Error("useEncryption must be used inside EncryptionProvider");
  return ctx;
};