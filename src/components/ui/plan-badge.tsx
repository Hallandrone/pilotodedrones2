import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';
import { PlanType } from '@/lib/planFeatures';

interface PlanBadgeProps {
	plan: PlanType;
	className?: string;
	showIcon?: boolean;
}

/**
 * Badge visual para mostrar el plan del usuario
 */
export function PlanBadge({ plan, className = '', showIcon = true }: PlanBadgeProps) {
	const getPlanConfig = (planType: PlanType) => {
		switch (planType) {
			case 'pro':
				return {
					label: 'Pro',
					className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0',
					icon: Crown,
				};
			case 'free':
			default:
				return {
					label: 'Gratis',
					className: 'bg-gray-100 text-gray-700 border-gray-300',
					icon: Sparkles,
				};
		}
	};

	const config = getPlanConfig(plan);
	const Icon = config.icon;

	return (
		<Badge className={`${config.className} ${className} font-semibold`}>
			{showIcon && <Icon className="h-3 w-3 mr-1" />}
			{config.label}
		</Badge>
	);
}

export default PlanBadge;
