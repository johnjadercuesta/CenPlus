const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replaceContent) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.match(searchRegex)) {
    content = content.replace(searchRegex, replaceContent);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Updated", filePath);
  } else {
    console.log("No match in", filePath);
  }
}

// 1. ciudadanos/route.ts (POST)
replaceInFile(
  path.join(__dirname, '../src/app/api/ciudadanos/route.ts'),
  /data\.es_lider = data\.es_lider === 1;\s*return NextResponse\.json\(\{\s*data,\s*message:\s*"Registro exitoso"\s*\}, \s*\{\s*status:\s*201\s*\}\);/,
  `data.es_lider = data.es_lider === 1;

    const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "ciudadanos", accion: "Registró ciudadano: " + data.nombre_completo + " (" + data.id_unico + ")" });
    }

    return NextResponse.json({ data, message: "Registro exitoso" }, { status: 201 });`
);

// 2. ciudadanos/[id]/route.ts (PUT)
replaceInFile(
  path.join(__dirname, '../src/app/api/ciudadanos/[id]/route.ts'),
  /const data = rows\[0\];\s*return NextResponse\.json\(\{\s*data,\s*message:\s*"Actualización exitosa"\s*\}\);/,
  `const data = rows[0];
    const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "ciudadanos", accion: "Actualizó ciudadano: " + data.nombre_completo + " (" + data.id_unico + ")" });
    }
    return NextResponse.json({ data, message: "Actualización exitosa" });`
);

// 3. ciudadanos/[id]/route.ts (DELETE)
replaceInFile(
  path.join(__dirname, '../src/app/api/ciudadanos/[id]/route.ts'),
  /if \(rows\.length === 0\) \{\s*return NextResponse\.json\(\{ error: "Ciudadano no encontrado" \}, \{ status: 404 \}\);\s*\}\s*return NextResponse\.json\(\{ message: "Eliminado correctamente" \}\);/,
  `if (rows.length === 0) {
      return NextResponse.json({ error: "Ciudadano no encontrado" }, { status: 404 });
    }
    const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "ciudadanos", accion: "Eliminó ciudadano ID: " + id });
    }
    return NextResponse.json({ message: "Eliminado correctamente" });`
);

// 4. lideres/route.ts (POST)
replaceInFile(
  path.join(__dirname, '../src/app/api/lideres/route.ts'),
  /return NextResponse\.json\(\{\s*data: user,\s*message: "Líder registrado correctamente"\s*\}, \{\s*status: 201\s*\}\);/,
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "lideres", accion: "Registró nuevo líder: " + body.nombre + " (" + body.email + ")" });
    }
    return NextResponse.json({ data: user, message: "Líder registrado correctamente" }, { status: 201 });`
);

// 5. lideres/[id]/route.ts (PUT)
replaceInFile(
  path.join(__dirname, '../src/app/api/lideres/[id]/route.ts'),
  /const data = rows\[0\];\s*delete data\.password;\s*return NextResponse\.json\(\{\s*data,\s*message:\s*"Líder actualizado correctamente"\s*\}\);/,
  `const data = rows[0];
    delete data.password;
    const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "lideres", accion: "Actualizó líder: " + data.nombre + " (" + data.email + ")" });
    }
    return NextResponse.json({ data, message: "Líder actualizado correctamente" });`
);

// 6. sectores/route.ts (POST)
replaceInFile(
  path.join(__dirname, '../src/app/api/sectores/route.ts'),
  /const data = rows\[0\];\s*return NextResponse\.json\(\{\s*data,\s*message:\s*"Sector creado exitosamente"\s*\}, \{\s*status: 201\s*\}\);/,
  `const data = rows[0];
    const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "sectores", accion: "Creó sector/meta: " + data.nombre });
    }
    return NextResponse.json({ data, message: "Sector creado exitosamente" }, { status: 201 });`
);

console.log("Done adding logs");
