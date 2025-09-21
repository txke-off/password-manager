import React, { useState } from "react";
import "../index.css";

interface PasswordGeneratorProps {
  onClose: () => void;
}

interface GeneratorSettings {
  length: number;
  include_uppercase: boolean;
  include_lowercase: boolean;
  include_numbers: boolean;
  include_symbols: boolean;
  exclude_similar: boolean;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<GeneratorSettings>({
    length: 16,
    include_uppercase: true,
    include_lowercase: true,
    include_numbers: true,
    include_symbols: true,
    exclude_similar: false,
  });

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/generate-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPassword(data.password);
      }
    } catch (error) {
      console.error("Error generating password:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleSettingChange = (
    key: keyof GeneratorSettings,
    value: boolean | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;

    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2)
      return { strength: "Weak", color: "bg-red-500", width: "33%" };
    if (score <= 4)
      return { strength: "Medium", color: "bg-yellow-500", width: "66%" };
    return { strength: "Strong", color: "bg-green-500", width: "100%" };
  };

  const passwordStrength = generatedPassword
    ? getPasswordStrength(generatedPassword)
    : null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto px-4 sm:px-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Password Generator
          </h3>
        </div>

        <div className="px-6 py-4 space-y-6">
          {generatedPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Generated Password
                </label>
                <button
                  onClick={copyToClipboard}
                  className={`text-sm px-3 py-1 rounded ${
                    copied
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border">
                <div className="font-mono text-sm break-all">
                  {generatedPassword}
                </div>
              </div>

              {passwordStrength && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Strength</span>
                    <span
                      className={`font-medium ${
                        passwordStrength.strength === "Strong"
                          ? "text-green-600"
                          : passwordStrength.strength === "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Length: {settings.length}
            </label>
            <input
              type="range"
              min="4"
              max="128"
              value={settings.length}
              onChange={(e) =>
                handleSettingChange("length", parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>4</span>
              <span>128</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Include Characters
            </h4>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_uppercase}
                  onChange={(e) =>
                    handleSettingChange("include_uppercase", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Uppercase Letters (A-Z)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_lowercase}
                  onChange={(e) =>
                    handleSettingChange("include_lowercase", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Lowercase Letters (a-z)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_numbers}
                  onChange={(e) =>
                    handleSettingChange("include_numbers", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Numbers (0-9)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_symbols}
                  onChange={(e) =>
                    handleSettingChange("include_symbols", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Symbols (!@#$%^&*)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.exclude_similar}
                  onChange={(e) =>
                    handleSettingChange("exclude_similar", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Exclude Similar Characters (0, O, l, I)
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={generatePassword}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Password"}
          </button>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordGenerator;
