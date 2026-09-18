import React, { useState, useMemo, Component, ReactNode } from 'react';
import { X, Copy, Check, ArrowLeft, Code, Building, Sparkles, AlertTriangle } from 'lucide-react';
import { SavedChatgptPackage } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { normalizeProjectDomainName } from '../../lib/chatgptPackageParser';

export interface SavedPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatgptPackage?: SavedChatgptPackage | null;
  packageData?: SavedChatgptPackage | null;
  businessName?: string;
  leadId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PackageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('SavedPackageModal rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-xs font-['Poppins']">
          <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 text-[#68645D]">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#292A29]">
              Unable to display this package.
            </h2>
            <p className="text-xs text-[#969188]">
              An unexpected display error occurred. Your client and CRM data remain safe.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  (this as any).setState({ hasError: false });
                  this.props.onClose();
                }}
                className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SavedPackageModalContent: React.FC<SavedPackageModalProps> = ({
  isOpen,
  onClose,
  chatgptPackage,
  packageData,
  businessName,
  leadId
}) => {
  const [copiedSection, setCopiedSection] = useState<'instruction' | 'json' | 'name' | null>(null);

  // Extract package safely from either chatgptPackage or packageData prop
  const pkg = chatgptPackage || packageData || null;

  // Pretty-print JSON if valid, or fall back to raw content with corruption notice
  // useMemo ensures JSON.parse is only called once when clientProfileJson changes, never on re-renders
  const { formattedJson, isJsonCorrupted } = useMemo(() => {
    if (!pkg?.clientProfileJson) {
      return { formattedJson: '', isJsonCorrupted: false };
    }
    const raw = pkg.clientProfileJson.trim();
    try {
      const parsed = JSON.parse(raw);
      return { formattedJson: JSON.stringify(parsed, null, 2), isJsonCorrupted: false };
    } catch {
      return { formattedJson: raw, isJsonCorrupted: true };
    }
  }, [pkg?.clientProfileJson]);

  if (!isOpen) return null;

  // Safe fallback if lead has no saved package
  if (!pkg) {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-xs font-['Poppins']">
        <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 text-[#68645D]">
          <div className="w-12 h-12 rounded-full bg-[#E5EEEE] text-[#245F6B] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#292A29]">
            Package not available for this client.
          </h2>
          <p className="text-xs text-[#969188]">
            {businessName ? `No saved ChatGPT Business Package found for ${businessName}.` : 'This prospect does not have an attached ChatGPT Business Package.'}
          </p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Back to Client
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveBusinessName = pkg.businessName || businessName || 'Client';
  const effectiveProjectDomainName = pkg.projectDomainName || normalizeProjectDomainName(effectiveBusinessName);
  const effectiveInstruction = pkg.geminiInstruction || '';

  const handleCopy = async (text: string, section: 'instruction' | 'json' | 'name') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedSection(section);
    setTimeout(() => {
      setCopiedSection((prev) => (prev === section ? null : prev));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-5xl w-full h-[92vh] flex flex-col text-[#68645D] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-[#DDD8CE] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#F0EDE5] hover:bg-[#E8E9E2] text-[#292A29] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#DDD8CE]"
              title="Return to client details"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Client</span>
            </button>
            <div className="h-5 w-px bg-[#DDD8CE] hidden sm:block" />
            <div>
              <h2 className="font-bold text-base text-[#292A29] flex items-center gap-2">
                <span>ChatGPT Business Package</span>
                {leadId && (
                  <span className="text-[11px] font-semibold text-[#245F6B] bg-[#E5EEEE] px-2 py-0.5 rounded-md">
                    {leadId}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#969188] font-medium">
                {effectiveBusinessName} • Saved {pkg.savedAt ? formatDateTime(pkg.savedAt) : 'with client'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#969188] hover:text-[#292A29] hover:bg-[#F0EDE5] rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Package Content with the 3 Distinct Outputs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">

          {/* OUTPUT 1: GEMINI IMPLEMENTATION INSTRUCTION */}
          <div className="bg-white border border-[#DDD8CE] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD8CE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#245F6B]/10 text-[#245F6B] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#292A29] uppercase tracking-wider">
                    Gemini Implementation Instruction
                  </h3>
                  <p className="text-[11px] text-[#969188]">
                    Original exact prompt and instructions for Gemini prototype generation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(effectiveInstruction, 'instruction')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedSection === 'instruction'
                    ? 'bg-[#4F765C] text-white shadow-xs'
                    : 'bg-[#245F6B] hover:bg-[#1E505A] text-white shadow-xs'
                }`}
              >
                {copiedSection === 'instruction' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Gemini Instruction</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#F8F9FA] border border-[#DDD8CE] rounded-xl p-4 max-h-80 overflow-y-auto">
              <pre className="text-xs font-mono text-[#292A29] whitespace-pre-wrap leading-relaxed select-text">
                {effectiveInstruction || '(Empty Instruction)'}
              </pre>
            </div>
          </div>

          {/* OUTPUT 2: CLIENT PROFILE (JSON) */}
          <div className="bg-white border border-[#DDD8CE] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD8CE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#245F6B]/10 text-[#245F6B] flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#292A29] uppercase tracking-wider">
                    Client Profile (JSON)
                  </h3>
                  <p className="text-[11px] text-[#969188]">
                    Original exact JSON payload with structured business metadata
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(formattedJson, 'json')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedSection === 'json'
                    ? 'bg-[#4F765C] text-white shadow-xs'
                    : 'bg-[#245F6B] hover:bg-[#1E505A] text-white shadow-xs'
                }`}
              >
                {copiedSection === 'json' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* If JSON is corrupted or invalid, display clear warning without crashing */}
            {isJsonCorrupted && (
              <div className="bg-[#D9A441]/15 border border-[#D9A441]/40 rounded-xl px-3.5 py-2 text-xs text-[#91651B] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D9A441]" />
                <span>Client profile JSON could not be parsed. Showing raw stored content.</span>
              </div>
            )}

            <div className="bg-[#292A29] text-[#4F765C] border border-slate-700 rounded-xl p-4 max-h-80 overflow-y-auto">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed select-text">
                {formattedJson || '{}'}
              </pre>
            </div>
          </div>

          {/* OUTPUT 3: PROJECT / DOMAIN NAME */}
          <div className="bg-white border border-[#DDD8CE] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD8CE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#245F6B]/10 text-[#245F6B] flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#292A29] uppercase tracking-wider">
                    PROJECT / DOMAIN NAME
                  </h3>
                  <p className="text-[11px] text-[#969188]">
                    Machine-safe project & domain identifier
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(effectiveProjectDomainName, 'name')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedSection === 'name'
                    ? 'bg-[#4F765C] text-white shadow-xs'
                    : 'bg-[#245F6B] hover:bg-[#1E505A] text-white shadow-xs'
                }`}
              >
                {copiedSection === 'name' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Project / Domain Name</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#F8F9FA] border border-[#DDD8CE] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#292A29] font-mono select-text">
                {effectiveProjectDomainName}
              </span>
              <span className="text-[11px] text-[#969188] font-medium font-mono">
                Folder: {effectiveProjectDomainName}/ • ZIP: {effectiveProjectDomainName}.zip
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#DDD8CE] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#969188]">
            Original unprocessed outputs safely stored with {effectiveBusinessName}.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            Back to Client
          </button>
        </div>

      </div>
    </div>
  );
};

export const SavedPackageModal: React.FC<SavedPackageModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <PackageErrorBoundary onClose={props.onClose}>
      <SavedPackageModalContent {...props} />
    </PackageErrorBoundary>
  );
};
