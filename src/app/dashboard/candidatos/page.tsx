import GestionCandidatos from "@/components/GestionCandidatos";

export default function CandidatosPage() {
  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Fórmula y Candidaturas</h1>
          <p className="main-header-subtitle">
            Administre los candidatos de la alianza (Alcaldía, Concejo, Gobernación, Senado, Cámara, Presidencia) y el cruce de votos
          </p>
        </div>
      </div>
      <div className="main-content">
        <GestionCandidatos />
      </div>
    </div>
  );
}
