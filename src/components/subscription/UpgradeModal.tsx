import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, ArrowRight } from 'lucide-react';
import { PlanType, getPlanDisplayName } from '@/lib/planFeatures';

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	requiredPlan: 'pro';
	feature: string;
	featureDescription?: string;
}

/**
 * Modal para solicitar upgrade de plan cuando el usuario intenta usar una característica premium
 */
export function UpgradeModal({
	open,
	onOpenChange,
	requiredPlan,
	feature,
	featureDescription,
}: UpgradeModalProps) {
	const navigate = useNavigate();

	const planConfig = {
		pro: {
			name: 'Plan Alumno Academia',
			icon: Crown,
			color: 'from-blue-500 to-cyan-500',
			features: [
				'Subida ilimitada de certificados',
				'URL personalizada para tu perfil',
				'Sello digital "Perfil Certificado"',
				'Perfil destacado en búsquedas',
				'Soporte por WhatsApp',
			],
		},
	};

	const config = planConfig[requiredPlan];
	const Icon = config.icon;

	const handleActivate = () => {
		onOpenChange(false);
		navigate('/pilot/membership');
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} mb-4`}>
						<Icon className="h-8 w-8 text-white" />
					</div>
					<DialogTitle className="text-2xl">
						{config.name}
					</DialogTitle>
					<DialogDescription className="text-base">
						{featureDescription || `La característica "${feature}" es exclusiva del ${config.name}.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
						<p className="text-sm text-muted-foreground">
							El <span className="font-semibold text-foreground">Plan Alumno Academia</span> es
							exclusivo para alumnos de <span className="font-semibold text-foreground">Academia Drone Chile</span>.
							Si ya eres alumno, actívalo con el código de tu diploma.
						</p>
					</div>

					<div className="space-y-2">
						<p className="font-semibold text-sm text-muted-foreground">Incluye:</p>
						<ul className="space-y-2">
							{config.features.map((item, index) => (
								<li key={index} className="flex items-start gap-2">
									<CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
									<span className="text-sm">{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button
						variant="outline"
						onClick={handleActivate}
						className="w-full sm:w-auto"
					>
						Ya soy alumno — activar con mi código
					</Button>
					<Button
						asChild
						className={`w-full sm:w-auto bg-gradient-to-r ${config.color} text-white hover:opacity-90`}
					>
						<a href="https://www.academiadronchile.cl" target="_blank" rel="noopener noreferrer">
							Conoce los cursos
							<ArrowRight className="h-4 w-4 ml-2" />
						</a>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default UpgradeModal;
