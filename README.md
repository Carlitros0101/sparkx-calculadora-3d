# Mi taller 3D

Calculadora personal para Creality SPARKX i7 Combo, en pesos chilenos. App estática, sin servidor, cuentas ni dependencias externas. Los archivos G-code se leen en el dispositivo y los ajustes se guardan en el navegador.

## Uso

Ingresa tiempo y material del trabajo completo, cantidad de piezas obtenidas y purga adicional. Si el laminador ya incluye la purga y la torre en el peso total, no las vuelvas a sumar. El precio por pieza es el precio del lote dividido por las piezas obtenidas.

Incluye filamento, electricidad, preparación y terminaciones, recuperación del valor de impresora, mantenimiento, otros gastos, reserva por fallas, ganancia e IVA opcional. Puedes copiar, guardar o imprimir el resumen. La app puede funcionar sin conexión tras una primera visita en HTTPS.

## Valores iniciales

- Impresora: $399.990.
- Hyper PLA blanco, negro, azul, verde y amarillo: $13.990 por bobina; peso supuesto de 1.000 g, por confirmar.
- Electricidad: $249,56/kWh con IVA, tarifa de referencia de septiembre de 2026. Incluye consumo, transporte y fondo de estabilización. Excluye administración, arriendo de medidor, intereses, ajustes de pago y subsidios.
- Consumo promedio: 100 W, estimación editable; no es una medición ni la potencia nominal del equipo.
- Recuperación de compra: 3.000 horas, supuesto editable; desactivada por defecto.
- Recargo sobre costo: 30 %, editable; no es una recomendación comercial.

## Cálculos

Electricidad = horas × W / 1.000 × CLP/kWh. Material = gramos × precio de bobina / peso neto. La reserva por fallas se aplica al material, purga, electricidad y uso de máquina; no a trabajo manual u otros gastos. No representa una probabilidad estadística.

Recargo: precio neto = costo × (1 + porcentaje). Margen sobre venta: precio neto = costo / (1 - porcentaje), con porcentaje menor que 100 %. IVA opcional se agrega al precio neto. Los costos son desembolsos brutos; no se realiza tratamiento de crédito fiscal. Los resultados se calculan sin redondear y se muestran en pesos enteros.

Importación de G-code: reconoce encabezados explícitos de tiempo y gramos. No convierte metros en gramos ni interpreta archivos 3MF o G-code binario. Si un encabezado no se reconoce, ingresa el dato manualmente y verifica el resultado contra el laminador.

## GitHub Pages

En Settings → Pages, selecciona Deploy from a branch, la rama main y la carpeta / (root). Todos los archivos se sirven desde rutas relativas, compatibles con un repositorio de GitHub Pages.

## Desarrollo

Sirve esta carpeta con cualquier servidor estático. Para comprobar los cálculos: `node --test tests/calculator.test.cjs`. No se necesita instalar paquetes.

No se incluyen boletas ni datos personales en el repositorio.

## Historial y Excel

Guardar trabajo crea un registro independiente con fecha y valores. La base se guarda solo en localStorage de ese navegador y no se sincroniza entre dispositivos. Excel puede exportar un trabajo o toda la base como .xlsx real, con números tipados, filtro y encabezado congelado. Los importes históricos son valores, no fórmulas que cambien al modificar precios futuros.

Descargar respaldo genera un archivo JSON. Restaurar respaldo valida sus registros y los combina por ID sin duplicados. Excel sirve para consulta y registro externo; la restauración en la app utiliza el respaldo JSON. Borrar datos del navegador elimina el historial local, por lo que conviene guardar respaldos periódicos.

Diseño personal inspirado en el verde, negro y blanco de Creality; no es una app oficial. No utiliza librerías de Excel ni conexiones externas para exportar.

## Importación de fichas públicas

MakerWorld, Printables y Thingiverse: lectura mediante Jina Reader sin clave. Se envía únicamente la URL pública normalizada, sin parámetros de seguimiento ni credenciales. Nombre y autor se importan; tiempo/peso de perfiles requieren selección y aplicación explícitas, quedan marcados como referencia y se exportan con su origen a Excel. No se calcula tiempo ni peso desde STL. El ID de perfil del enlace se conserva pero no se presume su correspondencia con la lista leída. Si hay CAPTCHA, bloqueo, límite o campos ausentes, el usuario puede pegar texto público o ingresar sus valores de Creality Print. No hay garantía de lectura en todas las fichas ni de permanencia del servicio externo.
