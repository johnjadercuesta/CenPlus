import GestionLideres from "@/components/GestionLideres";

export default function LideresPage() {
  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">GestiÃ³n de Usuarios</h1>
          <p className="main-header-subtitle">Cree y administre cuentas de lÃ­deres y administradores</p>
        </div>
      </div>
      <div className="main-content">
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-purple">Administrador</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>Acceso total, gestiona usuarios</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-blue">LÃ­der</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>Solo ve sus propios registros</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-gray">Simpatizante</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>Ciudadano registrado, sin acceso</span>
              </div>
            </div>
          </div>
        </div>

        <GestionLideres />
      </div>
    </div>
  );
}
