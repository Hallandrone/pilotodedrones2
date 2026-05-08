import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { getBaseUrlClean } from '@/lib/getBaseUrl';
import DiplomaPDF from '@/components/DiplomaPDF';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Award, Download, FileText, User, Calendar, Hash, History } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface DiplomaFormData {
	studentName: string;
	firstName: string;
	lastNamePaternal: string;
	lastNameMaternal: string;
	courseDate: string;
	instructorName: string;
	certificateNumber: string;
	courseHours: string;
	city: string;
	courseTitle: string;
	startDate?: string;
	endDate?: string;
	droneSeries: string;
}

const DiplomaGenerator = () => {
	const [formData, setFormData] = useState<DiplomaFormData>({
		studentName: '',
		firstName: '',
		lastNamePaternal: '',
		lastNameMaternal: '',
		courseDate: '',
		instructorName: '',
		certificateNumber: '',
		courseHours: '12',
		city: '',
		courseTitle: 'OPERADOR DE DRONES',
		startDate: '',
		endDate: '',
		droneSeries: '',
	});

	const [isFormValid, setIsFormValid] = useState(false);
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
	const [qrToken, setQrToken] = useState<string>('');
	const [correlativeNumber, setCorrelativeNumber] = useState<number>(0);
	const [certOption, setCertOption] = useState<string>('');
	const { toast: showToast } = useToast();
	const previewContainerRef = useRef<HTMLDivElement>(null);
	const [previewScale, setPreviewScale] = useState(1);

	useEffect(() => {
		const updateScale = () => {
			if (previewContainerRef.current) {
				const containerWidth = previewContainerRef.current.offsetWidth;
				const baseWidth = 935.43;
				setPreviewScale(containerWidth / baseWidth);
			}
		};

		const resizeObserver = new ResizeObserver(updateScale);
		if (previewContainerRef.current) {
			resizeObserver.observe(previewContainerRef.current);
		}

		updateScale();
		return () => resizeObserver.disconnect();
	}, []);

	useEffect(() => {
		generateQRCode();
		fetchNextCorrelative();
	}, []);

	const fetchNextCorrelative = async () => {
		try {
			const { count, error } = await supabase
				.from('diplomas')
				.select('*', { count: 'exact', head: true });

			if (error) throw error;
			// Comienza en #14600: suma 14600 al count actual
			setCorrelativeNumber((count || 0) + 14600);
		} catch (error) {
			console.error('Error fetching correlative:', error);
		}
	};

	const generateQRCode = async () => {
		try {
			// Generar código alfanumérico de 8 caracteres
			const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluyendo I, O, 1, 0 para evitar confusión
			let token = '';
			for (let i = 0; i < 8; i++) {
				token += characters.charAt(Math.floor(Math.random() * characters.length));
			}

			const qrUrl = `${getBaseUrlClean()}/qr/${token}`;

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
		if (qrToken && isFormValid) {
			try {
				const { data: diplomaData, error: diplomaError } = await supabase
					.from('diplomas')
					.insert({
						student_name: formData.studentName,
						course_date: formData.courseDate,
						course_hours: formData.courseHours,
						course_title: formData.courseTitle,
						instructor_name: formData.instructorName,
						city: formData.city,
						certificate_number: formData.certificateNumber,
						correlative_number: correlativeNumber,
						drone_series: formData.droneSeries
					} as never)
					.select()
					.single();

				if (diplomaError) throw diplomaError;

				const { error: tokenError } = await supabase.from('diploma_qr_tokens').insert({
					token: qrToken,
					diploma_id: diplomaData.id
				});

				if (tokenError) throw tokenError;

				// Notify admins
				const { sendNotification } = await import('@/lib/notification-service');
				await sendNotification({
					targetAdmins: true,
					type: 'diploma_created',
					title: 'Nuevo Diploma Generado',
					message: `Se ha generado un nuevo diploma para ${formData.studentName} (Certificado #${formData.certificateNumber})`,
					data: { diplomaId: diplomaData.id }
				});

				console.log('Diploma and QR token saved successfully');
				showToast({
					title: "Diploma Generado",
					description: "El diploma se ha registrado correctamente en el sistema.",
				});

				// Regenerar token para el siguiente diploma y evitar duplicados
				await generateQRCode();
				// Forzar recálculo del correlativo para el siguiente diploma
				await fetchNextCorrelative();
			} catch (error) {
				console.error('Error saving diploma data:', error);
				showToast({
					title: "Error",
					description: "No se pudo registrar el diploma en la base de datos.",
					variant: "destructive"
				});
			}
		}
	};

	const useLastDiplomaData = async () => {
		try {
			const { data: lastDiplomas, error } = await supabase
				.from('diplomas')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(1);

			if (error) throw error;

			if (lastDiplomas && lastDiplomas.length > 0) {
				const last = lastDiplomas[0];

				// Intentar parsear el nombre completo en partes para los nuevos campos
				const nameParts = (last.student_name || '').trim().split(' ');
				let firstName = '';
				let lastNamePaternal = '';
				let lastNameMaternal = '';

				if (nameParts.length >= 3) {
					lastNameMaternal = nameParts.pop() || '';
					lastNamePaternal = nameParts.pop() || '';
					firstName = nameParts.join(' ');
				} else if (nameParts.length === 2) {
					lastNamePaternal = nameParts[1];
					firstName = nameParts[0];
				} else {
					firstName = nameParts[0] || '';
				}

				// Actualizar datos del formulario
				const newFormData = {
					...formData,
					studentName: last.student_name || '',
					firstName,
					lastNamePaternal,
					lastNameMaternal,
					courseDate: last.course_date || '',
					courseHours: last.course_hours || '12',
					courseTitle: last.course_title || 'OPERADOR DE DRONES',
					city: last.city || '',
					certificateNumber: last.certificate_number || '',
					instructorName: last.instructor_name || '',
					droneSeries: (last as { drone_series?: string }).drone_series || '',
				};

				setFormData(newFormData);

				// Sincronizar el selector de número de certificado
				if (['1501', '1688'].includes(last.certificate_number)) {
					setCertOption(last.certificate_number);
				} else if (last.certificate_number) {
					setCertOption('other');
				}

				showToast({
					title: "Datos Cargados",
					description: "Se ha cargado la información del último diploma generado.",
				});

				// Validar el formulario con los nuevos datos
				setIsFormValid(
					newFormData.studentName.trim() !== '' &&
					newFormData.courseDate.trim() !== '' &&
					newFormData.certificateNumber.trim() !== '' &&
					newFormData.city.trim() !== '' &&
					newFormData.droneSeries.trim() !== ''
				);
			} else {
				showToast({
					title: "Sin registros",
					description: "No se encontraron diplomas previos en el sistema.",
					variant: "destructive"
				});
			}
		} catch (error) {
			console.error('Error fetching last diploma:', error);
			showToast({
				title: "Error",
				description: "No se pudo obtener la información del último diploma.",
				variant: "destructive"
			});
		}
	};

	const handleInputChange = (field: keyof DiplomaFormData, value: string) => {
		const newData = { ...formData, [field]: value };

		// Si se cambia alguno de los campos de nombre, actualizar studentName
		if (field === 'firstName' || field === 'lastNamePaternal' || field === 'lastNameMaternal') {
			const fullName = [
				newData.firstName.trim(),
				newData.lastNamePaternal.trim(),
				newData.lastNameMaternal.trim()
			].filter(Boolean).join(' ');
			newData.studentName = fullName;
		}

		setFormData(newData);

		const isValid =
			newData.studentName.trim() !== '' &&
			(newData.firstName.trim() !== '' && newData.lastNamePaternal.trim() !== '' && newData.lastNameMaternal.trim() !== '') &&
			newData.courseDate.trim() !== '' &&
			newData.certificateNumber.trim() !== '' &&
			newData.city.trim() !== '' &&
			newData.droneSeries.trim() !== '';

		setIsFormValid(isValid);
	};

	const filename = `Certificado_${formData.studentName.replace(/\s+/g, '_')}_${formData.certificateNumber}.pdf`;

	return (
		<div className="space-y-6">
			<div className="space-y-3 mb-8">
				<h1 className="text-4xl font-bold text-white flex items-center gap-3">
					<Award className="h-10 w-10 text-[#00b3f3]" />
					Generador de Diplomas
				</h1>
				<p className="text-white/80 text-lg">
					Crea certificados profesionales de Academia Drones Chile ADOC
				</p>
			</div>

			<Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden hover:border-[#00b3f3]/30 transition-all duration-300">
				<CardHeader className="p-8 bg-transparent border-b border-white/10">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
						<div>
							<CardTitle className="flex items-center gap-3 text-white text-3xl font-bold">
								<div className="h-12 w-12 rounded-xl bg-[#00b3f3] flex items-center justify-center shadow-[0_0_15px_rgba(0,179,243,0.4)]">
									<FileText className="h-6 w-6 text-white" />
								</div>
								Datos del Certificado
							</CardTitle>
							<CardDescription className="text-white/70 text-lg mt-2">
								Complete los campos requeridos para generar el diploma
							</CardDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={useLastDiplomaData}
							className="h-12 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#00b3f3] transition-all duration-200 flex items-center gap-2 rounded-xl"
						>
							<History className="h-5 w-5" />
							Usar datos del último diploma
						</Button>
					</div>
				</CardHeader>

				<CardContent className="p-8 space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-3">
								<Label htmlFor="firstName" className="text-white font-semibold text-base flex items-center gap-2">
									<User className="h-5 w-5 text-[#00b3f3]" />
									Nombre(s)
									<span className="text-red-400">*</span>
								</Label>
								<Input
									id="firstName"
									value={formData.firstName}
									onChange={(e) => handleInputChange('firstName', e.target.value)}
									placeholder="Ej: Alex Francisco"
									className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
								/>
							</div>
							<div className="space-y-3">
								<Label htmlFor="lastNamePaternal" className="text-white font-semibold text-base">
									Apellido Paterno
									<span className="text-red-400">*</span>
								</Label>
								<Input
									id="lastNamePaternal"
									value={formData.lastNamePaternal}
									onChange={(e) => handleInputChange('lastNamePaternal', e.target.value)}
									placeholder="Ej: Ganiffo"
									className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
								/>
							</div>
							<div className="space-y-3">
								<Label htmlFor="lastNameMaternal" className="text-white font-semibold text-base">
									Apellido Materno
									<span className="text-red-400">*</span>
								</Label>
								<Input
									id="lastNameMaternal"
									value={formData.lastNameMaternal}
									onChange={(e) => handleInputChange('lastNameMaternal', e.target.value)}
									placeholder="Ej: Ortiz"
									className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
								/>
							</div>
						</div>

						<div className="space-y-3">
							<Label htmlFor="courseDate" className="text-white font-semibold text-base flex items-center gap-2">
								<Calendar className="h-5 w-5 text-[#00b3f3]" />
								Fecha Emisión Diploma
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

						<div className="space-y-3 md:col-span-2">
							<Label htmlFor="droneSeries" className="text-white font-semibold text-base flex items-center gap-2">
								<Award className="h-5 w-5 text-[#00b3f3]" />
								Certificado en la serie
								<span className="text-red-400">*</span>
							</Label>
							<Input
								id="droneSeries"
								value={formData.droneSeries}
								onChange={(e) => handleInputChange('droneSeries', e.target.value)}
								placeholder="Ej: Mavic, Phantom, Matrice"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>

						<div className="space-y-3">
							<Label htmlFor="startDate" className="text-white font-semibold text-base flex items-center gap-2">
								<Calendar className="h-5 w-5 text-[#00b3f3]" />
								Fecha Inicio de Curso (Opcional)
							</Label>
							<Input
								id="startDate"
								type="date"
								value={formData.startDate}
								onChange={(e) => handleInputChange('startDate', e.target.value)}
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
							/>
						</div>

						<div className="space-y-3">
							<Label htmlFor="endDate" className="text-white font-semibold text-base flex items-center gap-2">
								<Calendar className="h-5 w-5 text-[#00b3f3]" />
								Fecha Fin de Curso (Opcional)
							</Label>
							<Input
								id="endDate"
								type="date"
								value={formData.endDate}
								onChange={(e) => handleInputChange('endDate', e.target.value)}
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
							/>
						</div>

						<div className="space-y-3 md:col-span-2">
							<Label htmlFor="courseTitle" className="text-white font-semibold text-base flex items-center gap-2">
								<Award className="h-5 w-5 text-[#00b3f3]" />
								Título del Curso
							</Label>
							<Input
								id="courseTitle"
								value={formData.courseTitle}
								onChange={(e) => handleInputChange('courseTitle', e.target.value)}
								placeholder="Ej: OPERADOR DE DRONES"
								className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
							/>
						</div>

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

						<div className="space-y-3">
							<Label htmlFor="certificateNumber" className="text-white font-semibold text-base flex items-center gap-2">
								<Hash className="h-5 w-5 text-[#00b3f3]" />
								Número de Certificado
								<span className="text-red-400">*</span>
							</Label>
							<div className="space-y-3">
								<Select
									value={certOption}
									onValueChange={(value) => {
										setCertOption(value);
										if (value !== 'other') {
											handleInputChange('certificateNumber', value);
										} else {
											handleInputChange('certificateNumber', '');
										}
									}}
								>
									<SelectTrigger className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] text-lg">
										<SelectValue placeholder="Seleccione número..." />
									</SelectTrigger>
									<SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
										<SelectItem value="1501">1501</SelectItem>
										<SelectItem value="1688">1688</SelectItem>
										<SelectItem value="other">Otro (Ingresar manualmente)</SelectItem>
									</SelectContent>
								</Select>

								{certOption === 'other' && (
									<Input
										id="certificateNumber"
										value={formData.certificateNumber}
										onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
										placeholder="Ingrese número de certificado"
										className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
									/>
								)}
							</div>
						</div>
					</div>

					<div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<Award className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-blue-200">
								<p className="font-semibold mb-1">Información del Diploma</p>
								<p className="text-blue-300/80">
									Si ingresas un rango de fechas (Inicio y Fin), se incluirá automáticamente en la descripción del curso.
								</p>
							</div>
						</div>
					</div>

					<div className="pt-6 border-t border-white/10">
						{isFormValid ? (
							<PDFDownloadLink
								document={<DiplomaPDF data={{ ...formData, qrCodeDataUrl, correlativeNumber, qrToken }} />}
								fileName={filename}
								className="block w-full"
							>
								{({ loading }) => (
									<Button
										className="w-full h-16 text-lg font-bold rounded-2xl bg-[#00b3f3] hover:bg-[#0099cc] text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
										disabled={loading}
										onClick={handlePDFGenerated}
									>
										{loading ? 'Generando PDF...' : 'Descargar Diploma en PDF'}
									</Button>
								)}
							</PDFDownloadLink>
						) : (
							<Button className="w-full h-16 text-lg font-bold rounded-2xl bg-gray-500 text-white cursor-not-allowed opacity-50" disabled>
								Complete todos los campos requeridos
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{isFormValid && (
				<Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
					<CardHeader className="p-6 bg-transparent border-b border-white/10">
						<CardTitle className="text-white text-2xl font-bold">Vista Previa</CardTitle>
					</CardHeader>
					<CardContent className="p-6 space-y-4">
						<Alert className="bg-amber-500/10 border-amber-500/30 text-amber-200">
							<Info className="h-4 w-4 stroke-amber-400" />
							<AlertTitle className="text-amber-400 font-semibold">Nota Informativa</AlertTitle>
							<AlertDescription className="text-amber-200/80">
								Esta previsualización es solo una representación visual para verificar ortografía, datos y disposición general.
							</AlertDescription>
						</Alert>

						<div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/50" ref={previewContainerRef}>
							<div className="relative shadow-2xl origin-top-left" style={{
								width: '935.43px',
								height: '612.28px',
								transform: `scale(${previewScale})`,
								backgroundColor: 'white',
								marginBottom: `-${612.28 * (1 - previewScale)}px`,
								marginRight: `-${935.43 * (1 - previewScale)}px`
							}}>
								{/* Fondo Real del Diploma */}
								<img
									src="/DIPLOMA_2026.jpg"
									className="absolute inset-0 w-full h-full object-fill pointer-events-none"
									alt="Fondo Diploma"
								/>

								{/* Contenido Sincronizado EXACTAMEN TE con DiplomaPDF.tsx */}
								<div className="absolute inset-0 pointer-events-none p-0 flex flex-col items-center">
									{/* Correlativo */}
									<div className="absolute top-[80px] left-[60px] text-[7px] text-[#999]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
										#{String(correlativeNumber).padStart(5, '0')}
									</div>

									{/* Intro Text */}
									<div className="absolute top-[155px] left-0 right-0 text-center text-[15px] text-[#666]" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
										Academia de Drones de Chile, AOC N°{formData.certificateNumber || '1501'}, entrega el presente certificado a:
									</div>

									{/* Nombre Estudiante (Dinámico) */}
									<div className="absolute top-[182px] left-0 right-0 h-[100px] flex items-center justify-center text-center text-[#1a1a1a]" style={{
										fontFamily: 'Euphorigenic, serif',
										fontSize: `${formData.studentName.length <= 20 ? 65 : formData.studentName.length <= 30 ? 56 : formData.studentName.length <= 40 ? 48 : formData.studentName.length <= 50 ? 40 : 32}px`,
										lineHeight: 1
									}}>
										{formData.studentName}
									</div>

									{/* Descripción */}
									<div className="absolute top-[265px] left-0 right-0 px-[80px] text-center text-[15px] text-[#666] leading-[1.2]" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
										Por haber cumplido satisfactoriamente los requerimientos y desafíos desarrollados<br />en el curso teórico y práctico
										{formData.startDate && formData.endDate ? (
											` desde el ${new Date(formData.startDate + 'T00:00:00').getDate()} al ${new Date(formData.endDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
										) : formData.startDate ? (
											` el día ${new Date(formData.startDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
										) : ''} de {formData.courseHours} horas cronológicas.
									</div>

									{/* Certificado en la serie */}
									{formData.droneSeries && (
										<div className="absolute top-[308px] left-0 right-0 px-[80px] text-center text-[13px] text-[#666] leading-[1.2] font-bold uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
											Certificado en la serie: {formData.droneSeries}.
										</div>
									)}

									{/* Título del Curso (Dinámico) */}
									<div className="absolute top-[335px] left-0 right-0 text-center text-[#00A8E1] uppercase font-normal" style={{
										fontFamily: 'Croogla4F, sans-serif',
										fontSize: `${formData.courseTitle.length <= 20 ? 54 : formData.courseTitle.length <= 30 ? 46 : formData.courseTitle.length <= 40 ? 38 : 32}px`,
										letterSpacing: '0.5px'
									}}>
										{formData.courseTitle}
									</div>

									{/* Fecha y Ciudad */}
									<div className="absolute top-[395px] w-full text-center text-[14px] text-[#333]" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
										{formData.courseDate ? new Date(formData.courseDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
									</div>
									<div className="absolute top-[415px] w-full text-center text-[14px] text-[#333]" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
										{formData.city}
									</div>

									{/* QR Code y Texto Legal (Preview) */}
									{qrCodeDataUrl && (
										<div className="absolute top-[72px] left-[775px] w-[61px] h-[61px]">
											<img src={qrCodeDataUrl} className="w-full h-full" alt="QR Code" />
										</div>
									)}
									{qrToken && (
										<>
											<div className="absolute top-[135px] left-[740px] w-[130px] text-center text-[5.5px] text-[#333]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
												{qrToken}
											</div>
											<div className="absolute top-[155px] left-[740px] w-[130px] text-center text-[4.5px] text-[#666] leading-tight" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
												Código QR de validación del certificado<br />
												HDRONES®, la ausencia de este QR<br />
												invalida el documento
											</div>
										</>
									)}
									{/* Número AOC - equivalente a DiplomaPDF.tsx (bottom:87, left:192) */}
									{formData.certificateNumber && (
										<div className="absolute w-[80px] text-left text-[#666]" style={{
											bottom: '87px',
											left: '192px',
											fontSize: '12.5px',
											fontFamily: 'Montserrat, sans-serif',
											fontWeight: 600,
										}}>
											{formData.certificateNumber}
										</div>
									)}
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
