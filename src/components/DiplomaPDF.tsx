import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registro de fuentes personalizadas
// Fuentes disponibles en public/fonts/
Font.register({
	family: 'Euphorigenic',
	src: '/fonts/Euphorigenic.otf', // OTF funciona igual que TTF
});

// Usaremos Montserrat-Bold para el título del curso (no tenemos Croogla4F)
Font.register({
	family: 'Montserrat',
	fonts: [
		{
			src: '/fonts/Montserrat-Italic-VariableFont_wght.ttf',
			fontWeight: 300,
			fontStyle: 'italic',
		},
		{
			src: '/fonts/Montserrat-Bold.ttf',
			fontWeight: 700,
		},
	],
});

// Croogla 4F - Para el título del curso
Font.register({
	family: 'Croogla4F',
	src: '/fonts/fonnts.com-croogla_4f-regular.otf',
});

// OpenSans - registrado sin especificar weight/style para evitar conflictos
Font.register({
	family: 'OpenSans',
	src: '/fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf',
	// No especificamos fontWeight ni fontStyle para que acepte cualquier combinación
});

// A4 Landscape: 842x595 pts - Full Bleed sin márgenes
const styles = StyleSheet.create({
	page: {
		width: 842,
		height: 595,
		margin: 0,
		padding: 0,
	},
	backgroundImage: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: 842,
		height: 595,
		objectFit: 'fill', // Estirar para llenar sin recortar
	},
	// Contenedor para todos los elementos con posicionamiento absoluto
	content: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		zIndex: 1, // Contenido por encima del fondo
	},
	// Título "CERTIFICADO"
	title: {
		position: 'absolute',
		top: 80,
		left: 0,
		right: 0,
		fontSize: 68,
		fontFamily: 'Montserrat',
		fontWeight: 700,
		color: '#00A8E1',
		textAlign: 'center',
		letterSpacing: 2,
	},
	// Línea debajo de CERTIFICADO
	titleUnderline: {
		position: 'absolute',
		top: 158,
		left: 221,
		width: 400,
		height: 2,
		backgroundColor: '#00A8E1',
	},
	// Texto introductorio - debajo de la línea de CERTIFICADO
	introText: {
		position: 'absolute',
		top: 150,
		left: 80,
		right: 80,
		fontSize: 14,
		fontFamily: 'OpenSans',
		color: '#666',
		textAlign: 'center',
	},
	// Nombre del estudiante
	studentName: {
		position: 'absolute',
		top: 170,
		left: 80,
		right: 80,
		fontSize: 60,
		fontFamily: 'Euphorigenic',
		color: '#1a1a1a',
		textAlign: 'center',
	},
	// Descripción del curso
	description: {
		position: 'absolute',
		top: 245,
		left: 100,
		right: 100,
		fontSize: 13,
		fontFamily: 'OpenSans',
		color: '#666',
		textAlign: 'center',
		lineHeight: 1.5,
	},
	// Título del curso "OPERADOR DE DRONES"
	courseTitle: {
		position: 'absolute',
		top: 300,
		left: 80,  // Margen izquierdo
		right: 80, // Margen derecho
		fontFamily: 'Croogla4F',
		fontWeight: 400,
		color: '#00A8E1',
		textAlign: 'center',
		letterSpacing: 2,
	},
	// Fecha
	dateCity: {
		position: 'absolute',
		top: 370,
		left: 0,
		right: 0,
		fontSize: 14,
		fontFamily: 'Montserrat',
		fontWeight: 300,
		fontStyle: 'italic',
		color: '#666',
		textAlign: 'center',
	},
	city: {
		position: 'absolute',
		top: 390,
		left: 0,
		right: 0,
		fontSize: 14,
		fontFamily: 'Montserrat',
		fontWeight: 300,
		fontStyle: 'italic',
		color: '#666',
		textAlign: 'center',
	},
	// Firma del instructor
	signature: {
		position: 'absolute',
		top: 480,
		left: 0,
		right: 0,
		fontSize: 26,
		fontFamily: 'Montserrat',
		fontWeight: 700,
		color: '#333',
		textAlign: 'center',
	},
	signatureTitle: {
		position: 'absolute',
		top: 510,
		left: 0,
		right: 0,
		fontSize: 10,
		fontFamily: 'OpenSans',
		color: '#666',
		textAlign: 'center',
	},
	// QR Code - Posición ajustada según especificaciones
	// Valores originales: X:5236.2px Y:514.6px Size:437x437px
	// Escalados proporcionalmente al PDF A4 landscape (842x595 pts)
	// Asumiendo diseño original de ~6000px ancho
	qrCode: {
		position: 'absolute',
		left: 745,  // X: 5236.2 * (842/6000) ≈ 733
		top: 72,    // Y: 514.6 * (595/4243) ≈ 72
		width: 61,  // 437 * (842/6000) ≈ 61
		height: 61, // 437 * (595/4243) ≈ 61
	},
	// Logo HDrones
	logoHDronesContainer: {
		position: 'absolute',
		bottom: 120,
		left: 353,
		width: 136,
		height: 68,
	},
	logoHDrones: {
		width: '100%',
		height: '100%',
		objectFit: 'contain',
	},
	// Footer izquierdo - DGAC
	footerLeft: {
		position: 'absolute',
		bottom: 50,
		left: 60,
		width: 150,
		flexDirection: 'column',
		alignItems: 'center',
	},
	logoDGAC: {
		width: 80,
		height: 80,
		objectFit: 'contain',
	},
	footerTextLeft: {
		fontSize: 11,
		fontFamily: 'OpenSans',
		color: '#333',
		marginTop: 8,
		textAlign: 'center',
	},
	// Footer derecho - Piloto de Drones
	footerRight: {
		position: 'absolute',
		bottom: 50,
		right: 60,
		width: 150,
		flexDirection: 'column',
		alignItems: 'center',
	},
	logoPiloto: {
		width: 60,
		height: 60,
		objectFit: 'contain',
	},
	footerTextRight: {
		fontSize: 9,
		fontFamily: 'OpenSans',
		color: '#666',
		marginTop: 8,
		textAlign: 'center',
	},
	// Footer bottom
	footerBottom: {
		position: 'absolute',
		bottom: 30,
		left: 0,
		right: 0,
		textAlign: 'center',
		fontSize: 9,
		fontFamily: 'OpenSans',
		color: '#00A8E1',
	},
});

// Función para formatear fecha de YYYY-MM-DD a "DD de Mes del YYYY"
const formatDateToSpanish = (dateString: string): string => {
	if (!dateString) return '';

	const months = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];

	const date = new Date(dateString + 'T00:00:00');
	const day = date.getDate();
	const month = months[date.getMonth()];
	const year = date.getFullYear();

	return `${day} de ${month} del ${year}`;
};

interface DiplomaData {
	studentName: string;
	courseDate: string;
	instructorName: string;
	certificateNumber: string;
	courseHours?: string;
	city?: string;
	courseTitle?: string; // Título del curso (ej: "OPERADOR DE DRONES", "PILOTO PROFESIONAL")
	qrCodeDataUrl?: string; // Data URL del código QR generado
}

interface DiplomaPDFProps {
	data: DiplomaData;
}

const DiplomaPDF: React.FC<DiplomaPDFProps> = ({ data }) => {
	const hours = data.courseHours || '12';
	const city = data.city || 'Antofagasta';
	const formattedDate = formatDateToSpanish(data.courseDate);
	const courseTitle = data.courseTitle || 'OPERADOR DE DRONES';

	// Calcular tamaño de fuente dinámico basado en la longitud del título
	const getCourseTitleFontSize = (title: string): number => {
		const length = title.length;
		if (length <= 20) return 40;      // Títulos cortos: tamaño normal
		if (length <= 30) return 35;      // Títulos medios: un poco más pequeño
		if (length <= 40) return 30;      // Títulos largos: más pequeño
		return 26;                        // Títulos muy largos: tamaño mínimo
	};

	const courseTitleFontSize = getCourseTitleFontSize(courseTitle);

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/* Background Image - DIPLOMA_2026.jpg */}
				<Image
					src="/DIPLOMA_2026.jpg"
					style={styles.backgroundImage}
				/>

				{/* Textos directamente en la Page - Sin contenedor wrapper */}
				{/* Intro Text con número de certificado dinámico */}
				<Text style={styles.introText}>
					Academia de Drones de Chile, AOC N°{data.certificateNumber}, entrega el presente certificado a:
				</Text>

				{/* Student Name - Euphorigenic 60pt */}
				<Text style={styles.studentName}>{data.studentName}</Text>

				{/* Description - OpenSans */}
				<Text style={styles.description}>
					Por haber cumplido satisfactoriamente los requerimientos y desafíos desarrollados en el curso teórico y práctico de {hours} horas cronológicas.
				</Text>

				{/* Course Title - Montserrat Bold, azul, tamaño dinámico */}
				<Text style={{ ...styles.courseTitle, fontSize: courseTitleFontSize }}>
					{courseTitle}
				</Text>

				{/* Date and City - Montserrat Light Italic 14pt */}
				<Text style={styles.dateCity}>{formattedDate}</Text>
				<Text style={styles.city}>{city}</Text>

				{/* QR Code */}
				{data.qrCodeDataUrl && (
					<Image
						src={data.qrCodeDataUrl}
						style={styles.qrCode}
					/>
				)}
			</Page>
		</Document>
	);
};

export default DiplomaPDF;
