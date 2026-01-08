import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /notifications
 * Get all active notifications for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: notifications, error } = await db
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
      return;
    }

    // Filter notifications based on user and expiration
    const now = new Date();
    const userNotifications = (notifications || []).filter(notif => {
      // Check if expired
      if (notif.expires_at && new Date(notif.expires_at) <= now) {
        return false;
      }

      // Check if user already dismissed
      if (notif.dismissed_by && notif.dismissed_by.includes(userId)) {
        return false;
      }

      // Check targeting
      if (notif.target_type === 'all') return true;
      if (notif.target_type === 'role' && notif.target_role === req.user!.role) return true;
      if (notif.target_type === 'specific' && notif.target_user_ids?.includes(userId)) return true;

      return false;
    });

    res.json({ data: userNotifications });
  } catch (error) {
    console.error('Error in GET /notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /notifications/:id/dismiss
 * Dismiss a notification for current user and track metrics
 */
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Insert dismissal record (metrics)
    const { error: metricsError } = await db
      .from('notification_dismissals')
      .insert({
        notification_id: id,
        user_id: userId,
        dismissed_at: new Date().toISOString()
      });

    // Ignore if already dismissed (unique constraint)
    if (metricsError && metricsError.code !== '23505') {
      console.error('Error inserting dismissal metrics:', metricsError);
    }

    // Also update the dismissed_by array for backward compatibility
    const { data: notification, error: fetchError } = await db
      .from('notifications')
      .select('dismissed_by')
      .eq('id', id)
      .single();

    if (!fetchError && notification) {
      const dismissedBy = notification.dismissed_by || [];
      if (!dismissedBy.includes(userId)) {
        dismissedBy.push(userId);
        await db
          .from('notifications')
          .update({ dismissed_by: dismissedBy })
          .eq('id', id);
      }
    }

    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Error in POST /notifications/:id/dismiss:', error);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

/**
 * GET /notifications/admin/:id/metrics
 * Get dismissal metrics for a notification (admin only)
 */
router.get('/admin/:id/metrics', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: dismissals, error } = await db
      .from('notification_dismissals')
      .select('*, user:users!notification_dismissals_user_id_fkey(id, email, full_name, role)')
      .eq('notification_id', id)
      .order('dismissed_at', { ascending: false });

    if (error) {
      console.error('Error fetching dismissal metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
      return;
    }

    res.json({ 
      data: {
        total_dismissals: dismissals?.length || 0,
        dismissals: dismissals || []
      }
    });
  } catch (error) {
    console.error('Error in GET /notifications/admin/:id/metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /notifications/admin
 * Get all notifications (admin only)
 */
router.get('/admin/all', adminOnly, async (req: Request, res: Response) => {
  try {
    const { data: notifications, error } = await db
      .from('notifications')
      .select('*, created_by_user:users!notifications_created_by_fkey(email, full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
      return;
    }

    res.json({ data: notifications });
  } catch (error) {
    console.error('Error in GET /notifications/admin/all:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /notifications/admin
 * Create a new notification (admin only)
 */
router.post('/admin', adminOnly, async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      message,
      image_url,
      target_type,
      target_role,
      target_user_ids,
      expires_at
    } = req.body;

    // Validation
    if (!type || !['banner', 'modal', 'email'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Must be banner, modal, or email' });
      return;
    }

    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required' });
      return;
    }

    if (!target_type || !['all', 'role', 'specific'].includes(target_type)) {
      res.status(400).json({ error: 'Invalid target_type. Must be all, role, or specific' });
      return;
    }

    if (target_type === 'role' && !target_role) {
      res.status(400).json({ error: 'target_role is required when target_type is role' });
      return;
    }

    if (target_type === 'specific' && (!target_user_ids || target_user_ids.length === 0)) {
      res.status(400).json({ error: 'target_user_ids is required when target_type is specific' });
      return;
    }

    const { data: notification, error } = await db
      .from('notifications')
      .insert({
        type,
        title,
        message,
        image_url: image_url || null,
        target_type,
        target_role: target_role || null,
        target_user_ids: target_user_ids || null,
        created_by: req.user!.id,
        expires_at: expires_at || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
      return;
    }

    res.status(201).json({ 
      message: 'Notification created successfully',
      data: notification 
    });
  } catch (error) {
    console.error('Error in POST /notifications/admin:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * PUT /notifications/admin/:id
 * Update a notification (admin only)
 */
router.put('/admin/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      image_url,
      is_active,
      expires_at
    } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_active !== undefined) updates.is_active = is_active;
    if (expires_at !== undefined) updates.expires_at = expires_at;

    const { data: notification, error } = await db
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
      return;
    }

    res.json({ 
      message: 'Notification updated successfully',
      data: notification 
    });
  } catch (error) {
    console.error('Error in PUT /notifications/admin/:id:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * DELETE /notifications/admin/:id
 * Delete a notification (admin only)
 */
router.delete('/admin/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await db
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
      return;
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /notifications/admin/:id:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
