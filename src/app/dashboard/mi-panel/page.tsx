import PanelLiderMovil from "@/components/PanelLiderMovil";

export default function MiPanelPage() {
  return (
    <div>
      <div className="main-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="main-header-title">Mi Panel de Trabajo</h1>
          <p className="main-header-subtitle">
            Gestione sus electores asignados, avance de meta y registro rápido de campo
          </p>
        </div>
      </div>
      <div className="main-content">
        <PanelLiderMovil />
      </div>
    </div>
  );
}
