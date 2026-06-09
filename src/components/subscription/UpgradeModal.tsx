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
			price: '$8.000/mes',
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

	const handleUpgrade = () => {
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
						Actualiza a {config.name}
					</DialogTitle>
					<DialogDescription className="text-base">
						{featureDescription || `La característica "${feature}" está disponible en ${config.name}.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="flex items-baseline gap-2">
						<span className="text-3xl font-bold text-primary">{config.price}</span>
						<span className="text-muted-foreground">por mes</span>
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
						onClick={() => onOpenChange(false)}
						className="w-full sm:w-auto"
					>
						Ahora no
					</Button>
					<Button
						onClick={handleUpgrade}
						className={`w-full sm:w-auto bg-gradient-to-r ${config.color} text-white hover:opacity-90`}
					>
						Ver Planes
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default UpgradeModal;
