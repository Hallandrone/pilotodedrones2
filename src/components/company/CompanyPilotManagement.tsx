import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCompanyPilots } from '@/hooks/useCompanyPilots';
import { Users, UserPlus, Mail, X, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompanyPilotManagementProps {
	companyId: string;
}

export function CompanyPilotManagement({ companyId }: CompanyPilotManagementProps) {
	const {
		pilots,
		invitations,
		pendingInvitations,
		loading,
		maxPilots,
		canAddPilot,
		currentCount,
		sendInvitation,
		cancelInvitation,
		removePilot,
	} = useCompanyPilots(companyId);

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);

	const handleSendInvitation = async () => {
		if (!email.trim()) return;

		setSending(true);
		const result = await sendInvitation(email.trim(), message.trim() || undefined);
		setSending(false);

		if (result.success) {
			setEmail('');
			setMessage('');
			setIsDialogOpen(false);
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'pending':
				return (
					<Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
						<Clock className="h-3 w-3 mr-1" />
						Pendiente
					</Badge>
				);
			case 'accepted':
				return (
					<Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
						<CheckCircle className="h-3 w-3 mr-1" />
						Aceptada
					</Badge>
				);
			case 'rejected':
				return (
					<Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
						<XCircle className="h-3 w-3 mr-1" />
						Rechazada
					</Badge>
				);
			case 'cancelled':
				return (
					<Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
						<X className="h-3 w-3 mr-1" />
						Cancelada
					</Badge>
				);
			default:
				return null;
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="text-center text-muted-foreground">Cargando pilotos...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header con contador */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
								<Users className="h-6 w-6 text-primary" />
							</div>
							<div>
								<CardTitle>Mis Pilotos</CardTitle>
								<CardDescription>
									{currentCount} de {maxPilots} pilotos
								</CardDescription>
							</div>
						</div>
						<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button disabled={!canAddPilot}>
									<UserPlus className="h-4 w-4 mr-2" />
									Invitar Piloto
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Invitar Piloto</DialogTitle>
									<DialogDescription>
										Invita a un piloto a unirse a tu empresa. El piloto debe tener una cuenta registrada con plan gratis.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4 py-4">
									<div className="space-y-2">
										<label className="text-sm font-medium">Email del piloto</label>
										<Input
											type="email"
											placeholder="piloto@ejemplo.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">Mensaje (opcional)</label>
										<Textarea
											placeholder="Escribe un mensaje personalizado..."
											value={message}
											onChange={(e) => setMessage(e.target.value)}
											rows={3}
										/>
									</div>
								</div>
								<div className="flex justify-end gap-3">
									<Button variant="outline" onClick={() => setIsDialogOpen(false)}>
										Cancelar
									</Button>
									<Button onClick={handleSendInvitation} disabled={!email.trim() || sending}>
										{sending ? 'Enviando...' : 'Enviar Invitación'}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					{!canAddPilot && (
						<div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
							<p className="text-sm text-yellow-700 dark:text-yellow-400">
								Has alcanzado el límite máximo de {maxPilots} pilotos
							</p>
						</div>
					)}
					<div className="h-2 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{ width: `${(currentCount / maxPilots) * 100}%` }}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Lista de pilotos activos */}
			{pilots.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Pilotos Activos</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{pilots.map((pilot) => (
								<div
									key={pilot.id}
									className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
								>
									<div className="flex items-center gap-3">
										<Avatar>
											<AvatarImage src={pilot.pilot?.avatar_url || undefined} />
											<AvatarFallback>
												{pilot.pilot?.full_name?.charAt(0) || 'P'}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-medium">{pilot.pilot?.full_name || 'Piloto'}</p>
											<p className="text-sm text-muted-foreground">
												{pilot.pilot?.email ||
													invitations.find(i => i.pilot_id === pilot.pilot_id && i.status === 'accepted')?.pilot_email ||
													'Email no visible'}
											</p>
										</div>
									</div>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>¿Remover piloto?</AlertDialogTitle>
												<AlertDialogDescription>
													El piloto perderá acceso a las características Pro y será removido de tu empresa.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancelar</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => removePilot(pilot.pilot_id)}
													className="bg-red-500 hover:bg-red-600"
												>
													Remover
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Invitaciones pendientes */}
			{pendingInvitations.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Invitaciones Pendientes</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{pendingInvitations.map((invitation) => (
								<div
									key={invitation.id}
									className="flex items-center justify-between p-3 rounded-lg border bg-card"
								>
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
											<Mail className="h-5 w-5 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium">{invitation.pilot_email}</p>
											<p className="text-xs text-muted-foreground">
												Enviada {new Date(invitation.invited_at).toLocaleDateString()}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => cancelInvitation(invitation.id)}
										className="text-muted-foreground hover:text-red-500"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Historial de invitaciones */}
			{invitations.filter(inv => inv.status !== 'pending').length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Historial de Invitaciones</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{invitations
								.filter(inv => inv.status !== 'pending')
								.slice(0, 5)
								.map((invitation) => (
									<div
										key={invitation.id}
										className="flex items-center justify-between p-2 rounded-lg text-sm"
									>
										<span className="text-muted-foreground">{invitation.pilot_email}</span>
										{getStatusBadge(invitation.status)}
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Estado vacío */}
			{pilots.length === 0 && pendingInvitations.length === 0 && (
				<Card>
					<CardContent className="py-12">
						<div className="text-center space-y-3">
							<div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
								<Users className="h-8 w-8 text-muted-foreground" />
							</div>
							<div>
								<h3 className="font-semibold">No tienes pilotos aún</h3>
								<p className="text-sm text-muted-foreground">
									Invita a pilotos a unirse a tu empresa
								</p>
							</div>
							<Button onClick={() => setIsDialogOpen(true)}>
								<UserPlus className="h-4 w-4 mr-2" />
								Invitar Primer Piloto
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
