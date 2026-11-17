import DashboardMultinivel from "@/components/DashboardMultinivel";

export default function EscalaPage() {
  return (
    <div>
      <div className="main-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="main-header-title">Ámbito Electoral y Escala Territorial</h1>
          <p className="main-header-subtitle">
            Monitoree la campaña en escala Nacional (Presidencia/Senado), Departamental (Gobernación/Cámara) o Municipal (Alcaldía/Concejo)
          </p>
        </div>
      </div>
      <div className="main-content">
        <DashboardMultinivel />
      </div>
    </div>
  );
}
