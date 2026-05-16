import GestionSectores from "@/components/GestionSectores";

export default function SectoresPage() {
  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Sectores y Metas</h1>
          <p className="main-header-subtitle">Delimite zonas geogrÃ¡ficas y asigne metas por sector</p>
        </div>
      </div>
      <div className="main-content">
        <GestionSectores />
      </div>
    </div>
  );
}
