import TablaCiudadanos from "@/components/TablaCiudadanos";

export default function RegistrosPage() {
  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Registros</h1>
          <p className="main-header-subtitle">Busque, edite, elimine o exporte los registros</p>
        </div>
      </div>
      <div className="main-content">
        <TablaCiudadanos />
      </div>
    </div>
  );
}
