import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
	| 'new_certification'
	| 'new_flight_log'
	| 'diploma_created'
	| 'system';

interface SendNotificationParams {
	userIds?: string[]; // If provided, send to these specific users
	targetAdmins?: boolean; // If true, send to all admins/super_admins
	type: NotificationType;
	title: string;
	message: string;
	data?: any;
}

export const sendNotification = async ({
	userIds,
	targetAdmins,
	type,
	title,
	message,
	data = {}
}: SendNotificationParams) => {
	try {
		const recipients: string[] = userIds || [];

		if (targetAdmins) {
			// Fetch all admins and super_admins
			const { data: adminRoles, error: rolesError } = await supabase
				.from('user_roles')
				.select('id')
				.in('role', ['admin', 'super_admin']);

			if (rolesError) throw rolesError;

			if (adminRoles) {
				adminRoles.forEach(admin => {
					if (!recipients.includes(admin.id)) {
						recipients.push(admin.id);
					}
				});
			}
		}

		if (recipients.length === 0) return;

		// Insert notifications for all recipients
		const notificationsToInsert = recipients.map(uid => ({
			user_id: uid,
			type,
			title,
			message,
			data,
			read: false
		}));

		const { error } = await supabase
			.from('notifications')
			.insert(notificationsToInsert);

		if (error) throw error;

		console.log(`Notifications sent to ${recipients.length} users`);
		return { success: true };
	} catch (error) {
		console.error('Error sending notification:', error);
		return { success: false, error };
	}
};
