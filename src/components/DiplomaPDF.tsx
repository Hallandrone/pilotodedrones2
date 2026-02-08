import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registro de fuentes personalizadas
Font.register({
	family: 'Euphorigenic',
	src: '/fonts/Euphorigenic.otf',
});

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

Font.register({
	family: 'Croogla4F',
	src: '/fonts/fonnts.com-croogla_4f-regular.otf',
});

Font.register({
	family: 'OpenSans',
	src: '/fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf',
});

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
		objectFit: 'fill',
	},
	content: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		zIndex: 1,
	},
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
	titleUnderline: {
		position: 'absolute',
		top: 158,
		left: 221,
		width: 400,
		height: 2,
		backgroundColor: '#00A8E1',
	},
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
	courseTitle: {
		position: 'absolute',
		top: 300,
		left: 80,
		right: 80,
		fontFamily: 'Croogla4F',
		fontWeight: 400,
		color: '#00A8E1',
		textAlign: 'center',
		letterSpacing: 2,
	},
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
	qrCode: {
		position: 'absolute',
		left: 704,
		top: 72,
		width: 61,
		height: 61,
	},
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
	serialNumber: {
		position: 'absolute',
		top: 80,
		left: 60,
		fontSize: 7,
		fontFamily: 'Helvetica',
		color: '#999999',
	},
	validationCode: {
		position: 'absolute',
		top: 135,
		left: 675,
		width: 120,
		fontSize: 5.5,
		fontFamily: 'Helvetica',
		color: '#333',
		textAlign: 'center',
	},
	legalText: {
		position: 'absolute',
		top: 155,
		left: 675,
		width: 120,
		fontSize: 4.5,
		fontFamily: 'Helvetica',
		color: '#666',
		textAlign: 'center',
		lineHeight: 1.2,
	},
});

const formatDateToSpanish = (dateString: string): string => {
	if (!dateString) return '';
	const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
	const date = new Date(dateString + 'T00:00:00');
	return `${date.getDate()} de ${months[date.getMonth()]} del ${date.getFullYear()}`;
};

const formatDateRange = (start?: string, end?: string): string => {
	if (!start || !end) return '';
	const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
	const sDate = new Date(start + 'T00:00:00');
	const eDate = new Date(end + 'T00:00:00');
	const sDay = sDate.getDate();
	const sMonth = months[sDate.getMonth()];
	const sYear = sDate.getFullYear();
	const eDay = eDate.getDate();
	const eMonth = months[eDate.getMonth()];
	const eYear = eDate.getFullYear();

	if (sMonth === eMonth && sYear === eYear) {
		return `desde el ${sDay} al ${eDay} de ${eMonth} del ${eYear}`;
	} else {
		return `desde el ${sDay} de ${sMonth} hasta el ${eDay} de ${eMonth} del ${eYear}`;
	}
};

export interface DiplomaData {
	studentName: string;
	courseDate: string;
	instructorName: string;
	certificateNumber: string;
	courseHours?: string;
	city?: string;
	courseTitle?: string;
	qrCodeDataUrl?: string;
	correlativeNumber?: number;
	startDate?: string;
	endDate?: string;
	qrToken?: string;
}

interface DiplomaPDFProps {
	data: DiplomaData;
}

const DiplomaPDF: React.FC<DiplomaPDFProps> = ({ data }) => {
	const hours = data.courseHours || '12';
	const city = data.city || 'Antofagasta';
	const formattedDate = formatDateToSpanish(data.courseDate);
	const courseTitle = data.courseTitle || 'OPERADOR DE DRONES';

	const getStudentNameFontSize = (name: string): number => {
		const length = name.length;
		if (length <= 20) return 60;
		if (length <= 30) return 50;
		if (length <= 40) return 40;
		if (length <= 50) return 32;
		return 28;
	};

	const getCourseTitleFontSize = (title: string): number => {
		const length = title.length;
		if (length <= 20) return 40;
		if (length <= 30) return 35;
		if (length <= 40) return 30;
		return 26;
	};

	const studentNameFontSize = getStudentNameFontSize(data.studentName);
	const courseTitleFontSize = getCourseTitleFontSize(courseTitle);

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<Image src="/DIPLOMA_2026.jpg" style={styles.backgroundImage} />
				<Text style={styles.introText}>
					Academia de Drones de Chile, AOC N°{data.certificateNumber}, entrega el presente certificado a:
				</Text>
				<Text style={{ ...styles.studentName, fontSize: studentNameFontSize }}>{data.studentName}</Text>
				<Text style={styles.description}>
					Por haber cumplido satisfactoriamente los requerimientos y desafíos desarrollados en el curso teórico y práctico
					{data.startDate && data.endDate ? (
						` ${formatDateRange(data.startDate, data.endDate)}`
					) : data.startDate ? (
						` el día ${formatDateToSpanish(data.startDate)}`
					) : ''} de {hours} horas cronológicas.
				</Text>
				<Text style={{ ...styles.courseTitle, fontSize: courseTitleFontSize }}>{courseTitle}</Text>
				<Text style={styles.dateCity}>{formattedDate}</Text>
				<Text style={styles.city}>{city}</Text>
				{data.qrCodeDataUrl && <Image src={data.qrCodeDataUrl} style={styles.qrCode} />}
				{data.qrToken && (
					<>
						<Text style={styles.validationCode}>{data.qrToken}</Text>
						<Text style={styles.legalText}>
							Código QR de validación del certificado HDRONES®.{'\n'}
							La ausencia de este QR invalida el documento.
						</Text>
					</>
				)}
				{data.correlativeNumber && (
					<Text style={styles.serialNumber}>
						#{String(data.correlativeNumber).padStart(4, '0')}
					</Text>
				)}
			</Page>
		</Document>
	);
};

export default DiplomaPDF;
