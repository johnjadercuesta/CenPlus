import OperacionDiaD from "@/components/OperacionDiaD";

export default function DiaDPage() {
  return (
    <div>
      <div className="main-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="main-header-title">Operación Día D y Testigos Electorales</h1>
          <p className="main-header-subtitle">
            Monitoreo en tiempo real del preconteo E-14, cobertura de testigos por mesa y escrutinio oficial
          </p>
        </div>
      </div>
      <div className="main-content">
        <OperacionDiaD />
      </div>
    </div>
  );
}
