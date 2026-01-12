import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import DiplomaPDF from '@/components/DiplomaPDF';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Award, Download, FileText, User, Calendar, PenTool, Hash, QrCode as QrCodeIcon } from 'lucide-react';

interface DiplomaFormData {
	studentName: string;
	courseDate: string;
	instructorName: string;
	certificateNumber: string;
	courseHours: string;
	city: string;
	courseTitle: string; // Título del curso
}

const DiplomaGenerator = () => {
	const [formData, setFormData] = useState<DiplomaFormData>({
		studentName: '',
		courseDate: '',
		instructorName: '',
		certificateNumber: '',
		courseHours: '12',
		city: '',
		courseTitle: 'OPERADOR DE DRONES',
	});

	const [isFormValid, setIsFormValid] = useState(false);
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
	const [qrToken, setQrToken] = useState<string>('');

	// Generar QR code al montar el componente
	useEffect(() => {
		generateQRCode();
	}, []);

	const generateQRCode = async () => {
		try {
			// Generar token único
			const token = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
			// SIEMPRE usar HTTPS (producción) incluso en desarrollo
			const qrUrl = 'https://pilotodedrones.cl/qr/' + token;


			// Generar QR code como data URL
			const dataUrl = await QRCode.toDataURL(qrUrl, {
				width: 200,
				margin: 1,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			});

			setQrToken(token);
			setQrCodeDataUrl(dataUrl);
		} catch (error) {
			console.error('Error generating QR code:', error);
		}
	};

	const handlePDFGenerated = async () => {
		// Guardar el token en la base de datos cuando se genera el PDF
		if (qrToken) {
			try {
				await supabase.from('diploma_qr_tokens').insert({
					token: qrToken,
					// diploma_id se puede agregar después si existe tabla diplomas
				});
				console.log('QR token saved:', qrToken);
			} catch (error) {
				console.error('Error saving QR token:', error);
			}
		}
	};

	const handleInputChange = (field: keyof DiplomaFormData, value: string) => {
		const newData = { ...formData, [field]: value };
		setFormData(newData);

		// Validar que los campos requeridos estén llenos (sin instructor ya que no se muestra)
		const isValid =
			newData.studentName.trim() !== '' &&
			newData.courseDate.trim() !== '' &&
			newData.certificateNumber.trim() !== '' &&
			newData.city.trim() !== '';

		setIsFormValid(isValid);
	};

	const filename = `Certificado_${formData.studentName.replace(/\s+/g, '_')}_${formData.certificateNumber}.pdf`;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-3 mb-8">
				<h1 className="text-4xl font-bold text-white flex items-center gap-3">
					<Award className="h-10 w-10 text-[#00b3f3]" />
					Generador de Diplomas
				</h1>
				<p className="text-white/80 text-lg">
					Crea certificados profesionales de Academia Drones Chile ADOC
				</p>
			</div>

			{/* Main Content */}
			<Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
				<CardHeader className="p-8 bg-transparent border-b border-white/10">
					<CardTitle className="flex items-center gap-3 text-white text-3xl font-bold">
						<div className="h-12 w-12 rounded-xl bg-[#00b3f3] flex items-center justify-center shadow-[0_0_15px_rgba(0,179,243,0.4)]">
							<FileText className="h-6 w-6 text-white" />
						</div>
						Datos del Certificado
					</CardTitle>
					<CardDescription className="text-white/70 text-lg mt-2">
						Complete los 4 campos principales para generar el diploma
					</CardDescription>
				</CardHeader>

				<CardContent className="p-8 space-y-8">
					{/* Form Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Student Name */}
						<div className="space-y-3 md:col-span-2">
							<Label htmlFor="studentName" className="text-white font-semibold text-base flex items-center gap-2">
								<User className="h-5 w-5 text-[#00b3f3]" />
								Nombre Completo del Estudiante
								<span className="text-red-400">*</span>
							</Label>
							<Input
								id="studentName"
								value={formData.studentName}
								onChange={(e) => handleInputChange('studentName', e.target.value)}
								placeholder="Ej: Alex Francisco Ganiffo Ortiz"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>

						{/* Course Date */}
						<div className="space-y-3">
							<Label htmlFor="courseDate" className="text-white font-semibold text-base flex items-center gap-2">
								<Calendar className="h-5 w-5 text-[#00b3f3]" />
								Fecha del Curso
								<span className="text-red-400">*</span>
							</Label>
							<Input
								id="courseDate"
								type="date"
								value={formData.courseDate}
								onChange={(e) => handleInputChange('courseDate', e.target.value)}
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
							/>
						</div>

						{/* Course Hours */}
						<div className="space-y-3">
							<Label htmlFor="courseHours" className="text-white font-semibold text-base flex items-center gap-2">
								<Award className="h-5 w-5 text-[#00b3f3]" />
								Horas del Curso
							</Label>
							<Input
								id="courseHours"
								value={formData.courseHours}
								onChange={(e) => handleInputChange('courseHours', e.target.value)}
								placeholder="12"
								type="number"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>

						{/* Course Title */}
						<div className="space-y-3 md:col-span-2">
							<Label htmlFor="courseTitle" className="text-white font-semibold text-base flex items-center gap-2">
								<Award className="h-5 w-5 text-[#00b3f3]" />
								Título del Curso
							</Label>
							<Input
								id="courseTitle"
								value={formData.courseTitle}
								onChange={(e) => handleInputChange('courseTitle', e.target.value)}
								placeholder="Ej: OPERADOR DE DRONES, PILOTO PROFESIONAL, etc."
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
							<p className="text-xs text-white/60 mt-1">
								Ejemplos: OPERADOR DE DRONES, PILOTO PROFESIONAL, INSTRUCTOR DE DRONES, etc.
							</p>
						</div>

						{/* Instructor Name - OCULTO (no se muestra en el PDF)
					<div className="space-y-3">
						<Label htmlFor="instructorName" className="text-white font-semibold text-base flex items-center gap-2">
							<PenTool className="h-5 w-5 text-[#00b3f3]" />
							Nombre del Instructor
						</Label>
						<Input
							id="instructorName"
							value={formData.instructorName}
							onChange={(e) => handleInputChange('instructorName', e.target.value)}
							placeholder="Ej: Hallan Ahumada Aravena"
							className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
						/>
					</div>
					*/}

						{/* City */}
						<div className="space-y-3">
							<Label htmlFor="city" className="text-white font-semibold text-base flex items-center gap-2">
								<Calendar className="h-5 w-5 text-[#00b3f3]" />
								Ciudad
								<span className="text-red-400">*</span>
							</Label>
							<Input
								id="city"
								value={formData.city}
								onChange={(e) => handleInputChange('city', e.target.value)}
								placeholder="Ej: Antofagasta"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>

						{/* Certificate Number */}
						<div className="space-y-3">
							<Label htmlFor="certificateNumber" className="text-white font-semibold text-base flex items-center gap-2">
								<Hash className="h-5 w-5 text-[#00b3f3]" />
								Número de Certificado
								<span className="text-red-400">*</span>
							</Label>
							<Input
								id="certificateNumber"
								value={formData.certificateNumber}
								onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
								placeholder="Ej: 1501"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>
					</div>

					{/* Info Alert */}
					<div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<Award className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-blue-200">
								<p className="font-semibold mb-1">Información del Diploma</p>
								<p className="text-blue-300/80">
									El diploma se generará con el diseño oficial de Academia Drones Chile ADOC.
									Todos los campos marcados con <span className="text-red-400">*</span> son obligatorios.
								</p>
							</div>
						</div>
					</div>

					{/* Generate Button */}
					<div className="pt-6 border-t border-white/10">
						{isFormValid ? (
							<PDFDownloadLink
								document={<DiplomaPDF data={{ ...formData, qrCodeDataUrl }} />}
								fileName={filename}
								className="block w-full"
							>
								{({ loading }) => (
									<Button
										className="w-full h-16 text-lg font-bold rounded-2xl bg-[#00b3f3] hover:bg-[#0099cc] text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
										disabled={loading}
										onClick={handlePDFGenerated}
									>
										{loading ? (
											<>
												<div className="h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												Generando PDF...
											</>
										) : (
											<>
												<Download className="h-6 w-6 mr-3" />
												Descargar Diploma en PDF
											</>
										)}
									</Button>
								)}
							</PDFDownloadLink>
						) : (
							<Button
								className="w-full h-16 text-lg font-bold rounded-2xl bg-gray-500 text-white cursor-not-allowed opacity-50"
								disabled
							>
								Complete todos los campos requeridos
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Preview Section */}
			{isFormValid && (
				<Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
					<CardHeader className="p-6 bg-transparent border-b border-white/10">
						<CardTitle className="text-white text-2xl font-bold flex items-center gap-2">
							<FileText className="h-6 w-6 text-[#00b3f3]" />
							Vista Previa
						</CardTitle>
						<CardDescription className="text-white/70">
							Así se verá tu diploma generado
						</CardDescription>
					</CardHeader>
					<CardContent className="p-6">
						<div className="relative bg-white rounded-lg p-8 shadow-lg border-8 border-[#00A8E1]" style={{
							backgroundImage: 'url(/DIPLOMA_2026.jpg)',
							backgroundSize: 'cover',
							backgroundPosition: 'center',
							backgroundBlendMode: 'lighten',
						}}>
							<div className="relative bg-white/90 p-6 rounded">
								<div className="text-center space-y-3 text-gray-800">
									<h2 className="text-5xl font-bold text-[#00A8E1]">CERTIFICADO</h2>
									<div className="w-64 h-0.5 bg-[#00A8E1] mx-auto my-2"></div>
									<p className="text-xs italic text-gray-600 pt-3">
										Academia de Drones de Chile, AOC N°1501, entrega el presente certificado a:
									</p>
									<p className="text-4xl italic py-3 font-serif text-black font-bold">{formData.studentName}</p>
									<p className="text-xs text-gray-600 px-8">
										Por haber cumplido satisfactoriamente los requerimientos y desafíos desarrollados en el curso teórico y práctico de {formData.courseHours} horas cronológicas.
									</p>
									<p className="text-3xl font-bold text-[#00A8E1] py-3">{formData.courseTitle || 'OPERADOR DE DRONES'}</p>
									<p className="text-sm italic text-[#00A8E1]">{formData.courseDate}</p>
									<p className="text-sm italic text-[#00A8E1]">{formData.city}</p>
									<p className="text-xl italic text-gray-800 pt-4">{formData.instructorName}</p>
									<p className="text-xs text-gray-600">DIRECTOR ACADEMIA DE DRONES CHILE</p>
									<div className="flex justify-between items-center pt-6 px-2 text-xs">
										<span className="font-bold text-gray-800 text-sm">AOC N° {formData.certificateNumber}</span>
										<span className="text-gray-600">WWW.PILOTODEDRONES.CL</span>
									</div>
									<p className="text-xs text-[#00A8E1] pt-2">ACADEMIA DE DRONES CHILE | WWW.ACADEMIADRONCHILE.CL</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default DiplomaGenerator;
