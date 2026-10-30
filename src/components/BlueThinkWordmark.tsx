import officialLogo from "../branding/bluethink-inc-official-master.png";

/** Official BlueThink Inc. wordmark. Always shown on an opaque light surface for legibility. */
export default function BlueThinkWordmark({ compact = false }: { compact?: boolean }) {
  return <span className={`bt-wordmark bt-original-logo${compact ? " bt-wordmark-compact" : ""}`}>
    <img className="bt-official-logo-image" src={officialLogo} alt="BlueThink Inc. — Think beyond" decoding="async" />
  </span>;
}
