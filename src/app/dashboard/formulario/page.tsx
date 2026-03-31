import FormularioCiudadano from "@/components/FormularioCiudadano";

export default function FormularioPage() {
  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Formulario de Registro</h1>
          <p className="main-header-subtitle">Ingrese los datos del ciudadano o simpatizante</p>
        </div>
      </div>
      <div className="main-content">
        <div className="card">
          <div className="card-body">
            <FormularioCiudadano />
          </div>
        </div>
      </div>
    </div>
  );
}
