const fs = require('fs');

function addLog(filePath, searchStr, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Success on", filePath);
  } else {
    console.log("Not found in", filePath);
  }
}

addLog(
  'src/app/api/lideres/route.ts',
  'return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });',
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "usuarios", accion: "Registró nuevo usuario: " + nombre + " (" + email + ")" });
    }
    return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });`
);

addLog(
  'src/app/api/sectores/route.ts',
  'return NextResponse.json({ data, message: "Sector creado" }, { status: 201 });',
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "sectores", accion: "Creó sector/meta: " + data.nombre });
    }
    return NextResponse.json({ data, message: "Sector creado" }, { status: 201 });`
);
