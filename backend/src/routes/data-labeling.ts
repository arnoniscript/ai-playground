import { Router } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { supabase } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { convertPdfToWatermarkedImages } from '../utils/pdf-watermark.js';
import { 
  ParentTask, 
  NextParentTask, 
  DataLabelingMetrics,
  ConsolidateParentTaskRequest,
  ParentTaskWithEvaluations
} from '../types.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Upload ZIP and create parent tasks
router.post(
  '/upload-zip/:playgroundId',
  authenticateToken,
  upload.single('zipFile'),
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    console.log('=== ZIP UPLOAD REQUEST ===');
    console.log('Playground ID:', playgroundId);
    console.log('User ID:', userId);
    console.log('User Role:', userRole);
    console.log('File received:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate playground exists and is data_labeling type
    const { data: playground, error: pgError } = await supabase
      .from('playgrounds')
      .select('id, type, repetitions_per_task')
      .eq('id', playgroundId)
      .single();

    console.log('Playground query result:', { playground, pgError });

    if (pgError || !playground) {
      return res.status(404).json({ error: 'Playground not found' });
    }

    if (playground.type !== 'data_labeling') {
      return res.status(400).json({ error: 'Playground must be data_labeling type' });
    }

    const repetitionsPerTask = playground.repetitions_per_task || 1;

    try {
      // Extract ZIP file
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();

      console.log('ZIP extracted, total entries:', zipEntries.length);

      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];
      const parentTasks: ParentTask[] = [];

      for (const entry of zipEntries) {
        console.log('Processing entry:', entry.name, 'isDirectory:', entry.isDirectory);
        
        // Skip directories and hidden files
        if (entry.isDirectory || entry.name.startsWith('.') || entry.name.startsWith('__MACOSX')) {
          console.log('Skipping:', entry.name);
          continue;
        }

        const fileName = entry.name;
        const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        console.log('File:', fileName, 'Extension:', fileExt);

        // Validate file type
        if (!validExtensions.includes(fileExt)) {
          console.log('Invalid extension, skipping');
          continue;
        }

        // Determine file type
        let fileType: 'image' | 'pdf' | 'text';
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
          fileType = 'image';
        } else if (fileExt === '.pdf') {
          fileType = 'pdf';
        } else {
          fileType = 'text';
        }

        console.log('File type determined:', fileType);

        // Get file buffer
        const fileBuffer = entry.getData();
        const fileSize = fileBuffer.length;

        console.log('File size:', fileSize, 'bytes');

        // Upload to Supabase Storage
        const storagePath = `${playgroundId}/${Date.now()}_${fileName}`;
        console.log('Uploading to storage path:', storagePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('data-labeling-files')
          .upload(storagePath, fileBuffer, {
            contentType: fileType === 'image' 
              ? `image/${fileExt.substring(1)}` 
              : fileType === 'pdf' 
                ? 'application/pdf' 
                : 'text/plain',
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload ${fileName}:`, uploadError);
          continue;
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('data-labeling-files')
          .getPublicUrl(storagePath);

        console.log('Public URL:', urlData.publicUrl);

        // Create parent task in database
        const { data: parentTask, error: taskError } = await supabase
          .from('parent_tasks')
          .insert({
            playground_id: playgroundId,
            file_name: fileName,
            file_type: fileType,
            file_url: urlData.publicUrl,
            file_size: fileSize,
            max_repetitions: repetitionsPerTask,
            current_repetitions: 0,
            status: 'active'
          })
          .select()
          .single();

        console.log('Parent task created:', { parentTask, taskError });

        if (!taskError && parentTask) {
          parentTasks.push(parentTask);
        }
      }

      console.log('Total parent tasks created:', parentTasks.length);

      // Update playground evaluation_goal if auto_calculate_evaluations is true
      const { data: pg } = await supabase
        .from('playgrounds')
        .select('auto_calculate_evaluations')
        .eq('id', playgroundId)
        .single();

      if (pg?.auto_calculate_evaluations) {
        const totalEvaluations = parentTasks.length * repetitionsPerTask;
        await supabase
          .from('playgrounds')
          .update({ evaluation_goal: totalEvaluations })
          .eq('id', playgroundId);
      }

      res.json({ 
        message: `Successfully uploaded ${parentTasks.length} files`,
        parent_tasks: parentTasks
      });
    } catch (error) {
      console.error('Error processing ZIP:', error);
      res.status(500).json({ error: 'Failed to process ZIP file' });
    }
  })
);

// Get next available parent task for user
router.get(
  '/next-task/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userId = req.user!.id;

    // Call database function to get next available task
    const { data, error } = await supabase
      .rpc('get_next_parent_task', {
        p_playground_id: playgroundId,
        p_user_id: userId
      });

    if (error) {
      console.error('Error getting next task:', error);
      return res.status(500).json({ error: 'Failed to get next task' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No available tasks' });
    }

    const nextTask: NextParentTask = {
      parent_task_id: data[0].parent_task_id,
      file_name: data[0].file_name,
      file_type: data[0].file_type,
      file_url: data[0].file_url
    };

    res.json(nextTask);
  })
);

// Record parent task evaluation
router.post(
  '/record-evaluation',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { parent_task_id, session_id } = req.body;
    const userId = req.user!.id;

    if (!parent_task_id || !session_id) {
      return res.status(400).json({ error: 'parent_task_id and session_id are required' });
    }

    // Insert evaluation record
    const { data, error } = await supabase
      .from('parent_task_evaluations')
      .insert({
        parent_task_id,
        user_id: userId,
        session_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording evaluation:', error);
      return res.status(500).json({ error: 'Failed to record evaluation' });
    }

    res.json({ success: true, evaluation: data });
  })
);

// Get data labeling metrics for playground
router.get(
  '/metrics/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;

    const { data, error } = await supabase
      .rpc('get_data_labeling_metrics', {
        p_playground_id: playgroundId
      });

    if (error) {
      console.error('Error getting metrics:', error);
      return res.status(500).json({ error: 'Failed to get metrics' });
    }

    const metrics: DataLabelingMetrics = data[0];
    res.json(metrics);
  })
);

// Get all parent tasks for playground (admin only)
router.get(
  '/parent-tasks/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .from('parent_tasks')
      .select('*')
      .eq('playground_id', playgroundId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting parent tasks:', error);
      return res.status(500).json({ error: 'Failed to get parent tasks' });
    }

    res.json(data);
  })
);

// Get consolidation data for parent task (admin only)
router.get(
  '/consolidation/:parentTaskId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { parentTaskId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .rpc('get_parent_task_consolidation_data', {
        p_parent_task_id: parentTaskId
      });

    if (error) {
      console.error('Error getting consolidation data:', error);
      return res.status(500).json({ error: 'Failed to get consolidation data' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Parent task not found' });
    }

    const consolidationData: ParentTaskWithEvaluations = {
      id: data[0].parent_task_id,
      playground_id: '', // Will be fetched separately if needed
      file_name: data[0].file_name,
      file_type: data[0].file_type,
      file_url: data[0].file_url,
      file_size: null,
      max_repetitions: data[0].max_repetitions,
      current_repetitions: data[0].current_repetitions,
      status: data[0].status,
      consolidated_at: null,
      consolidated_by: null,
      admin_notes: null,
      extra_repetitions: 0,
      created_at: '',
      updated_at: '',
      evaluations: data[0].evaluations_json || []
    };

    res.json(consolidationData);
  })
);

// Consolidate or return parent task to pipe (admin only)
router.post(
  '/consolidate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { 
      parent_task_id, 
      action, 
      admin_notes, 
      extra_repetitions,
      consolidated_answers, // Array of {question_id, answer_value?, answer_text?, source_evaluation_id?}
      ignore_reason
    } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!parent_task_id || !action) {
      return res.status(400).json({ error: 'parent_task_id and action are required' });
    }

    if (action === 'consolidate') {
      // Validate consolidated_answers is provided
      if (!consolidated_answers || !Array.isArray(consolidated_answers)) {
        return res.status(400).json({ error: 'consolidated_answers array is required for consolidation' });
      }

      // Start transaction: update parent_task status and save consolidated answers
      const { error: updateError } = await supabase
        .from('parent_tasks')
        .update({
          status: 'consolidated',
          consolidated_at: new Date().toISOString(),
          consolidated_by: userId,
          admin_notes: admin_notes || null
        })
        .eq('id', parent_task_id);

      if (updateError) {
        console.error('Error updating parent task status:', updateError);
        return res.status(500).json({ error: 'Failed to update task status' });
      }

      // Save consolidated answers
      const answersToInsert = consolidated_answers.map((answer: any) => ({
        parent_task_id,
        question_id: answer.question_id,
        answer_value: answer.answer_value || null,
        answer_text: answer.answer_text || null,
        source_evaluation_id: answer.source_evaluation_id || null,
        consolidated_by: userId,
        consolidated_at: new Date().toISOString()
      }));

      const { error: answersError } = await supabase
        .from('consolidated_answers')
        .upsert(answersToInsert, {
          onConflict: 'parent_task_id,question_id'
        });

      if (answersError) {
        console.error('Error saving consolidated answers:', answersError);
        return res.status(500).json({ error: 'Failed to save consolidated answers' });
      }

      res.json({ success: true, action: 'consolidated' });
    } else if (action === 'ignore') {
      // Ignore task - won't be part of dataset
      if (!ignore_reason) {
        return res.status(400).json({ error: 'ignore_reason is required when ignoring a task' });
      }

      const { error } = await supabase
        .from('parent_tasks')
        .update({
          status: 'ignored',
          ignore_reason,
          consolidated_at: new Date().toISOString(),
          consolidated_by: userId
        })
        .eq('id', parent_task_id);

      if (error) {
        console.error('Error ignoring task:', error);
        return res.status(500).json({ error: 'Failed to ignore task' });
      }

      res.json({ success: true, action: 'ignored' });
    } else if (action === 'return_to_pipe') {
      if (!extra_repetitions || extra_repetitions < 1) {
        return res.status(400).json({ error: 'extra_repetitions must be at least 1' });
      }

      const { data, error } = await supabase
        .rpc('return_parent_task_to_pipe', {
          p_parent_task_id: parent_task_id,
          p_admin_id: userId,
          p_admin_notes: admin_notes || '',
          p_extra_repetitions: extra_repetitions
        });

      if (error) {
        console.error('Error returning task to pipe:', error);
        return res.status(500).json({ error: 'Failed to return task to pipe' });
      }

      res.json({ success: true, action: 'returned_to_pipe' });
    } else {
      res.status(400).json({ error: 'Invalid action. Must be "consolidate", "ignore", or "return_to_pipe"' });
    }
  })
);

// Deconsolidate a parent task (admin only)
router.post(
  '/deconsolidate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { parent_task_id } = req.body;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!parent_task_id) {
      return res.status(400).json({ error: 'parent_task_id is required' });
    }

    console.log('=== DECONSOLIDATE TASK ===');
    console.log('Parent Task ID:', parent_task_id);
    console.log('Admin:', req.user!.email);

    // Check if task is consolidated
    const { data: task, error: fetchError } = await supabase
      .from('parent_tasks')
      .select('id, status')
      .eq('id', parent_task_id)
      .single();

    if (fetchError || !task) {
      console.error('Task not found:', fetchError);
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'consolidated') {
      return res.status(400).json({ error: 'Task is not consolidated' });
    }

    // Delete consolidated answers
    const { error: deleteAnswersError } = await supabase
      .from('consolidated_answers')
      .delete()
      .eq('parent_task_id', parent_task_id);

    if (deleteAnswersError) {
      console.error('Error deleting consolidated answers:', deleteAnswersError);
      return res.status(500).json({ error: 'Failed to delete consolidated answers' });
    }

    // Update parent task status back to active
    const { error: updateError } = await supabase
      .from('parent_tasks')
      .update({
        status: 'active',
        consolidated_at: null,
        consolidated_by: null,
        admin_notes: null
      })
      .eq('id', parent_task_id);

    if (updateError) {
      console.error('Error updating parent task status:', updateError);
      return res.status(500).json({ error: 'Failed to update task status' });
    }

    console.log('Task deconsolidated successfully');
    res.json({ success: true, message: 'Task deconsolidated successfully' });
  })
);

// Get parent task metrics by task (admin only)
router.get(
  '/task-metrics/:parentTaskId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { parentTaskId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: task, error } = await supabase
      .from('parent_tasks')
      .select(`
        id,
        file_name,
        file_type,
        status,
        max_repetitions,
        current_repetitions,
        extra_repetitions
      `)
      .eq('id', parentTaskId)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Parent task not found' });
    }

    const totalExpected = task.max_repetitions + task.extra_repetitions;
    const completionPercentage = totalExpected > 0 
      ? Math.round((task.current_repetitions / totalExpected) * 100) 
      : 0;

    res.json({
      parent_task_id: task.id,
      file_name: task.file_name,
      file_type: task.file_type,
      status: task.status,
      max_repetitions: task.max_repetitions,
      current_repetitions: task.current_repetitions,
      extra_repetitions: task.extra_repetitions,
      completion_percentage: completionPercentage,
      evaluations_count: task.current_repetitions
    });
  })
);

// Get PDF as watermarked images
router.get(
  '/pdf-watermarked/:parentTaskId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { parentTaskId } = req.params;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    console.log('=== PDF WATERMARK REQUEST ===');
    console.log('Parent Task ID:', parentTaskId);
    console.log('User:', userEmail);
    console.log('User ID:', userId);

    // Get parent task
    const { data: task, error } = await supabase
      .from('parent_tasks')
      .select('id, file_url, file_type, file_name')
      .eq('id', parentTaskId)
      .single();

    if (error || !task) {
      console.error('Parent task not found:', error);
      return res.status(404).json({ error: 'Parent task not found' });
    }

    console.log('Task found:', {
      id: task.id,
      fileName: task.file_name,
      fileType: task.file_type,
      fileUrl: task.file_url
    });

    if (task.file_type !== 'pdf') {
      return res.status(400).json({ error: 'Only PDF files can be watermarked' });
    }

    try {
      // Convert PDF to watermarked images
      const images = await convertPdfToWatermarkedImages(task.file_url, {
        userEmail,
        userId,
      });

      // Return images as JSON array with base64 data
      const imagesData = images.map((buffer, index) => ({
        page: index + 1,
        data: buffer.toString('base64'),
        mimeType: 'image/png',
      }));

      res.json({
        fileName: task.file_name,
        totalPages: images.length,
        images: imagesData,
      });
    } catch (error: any) {
      console.error('Error generating watermarked PDF:', error);
      res.status(500).json({ 
        error: 'Failed to generate watermarked PDF',
        details: error.message 
      });
    }
  })
);

// Export consolidated dataset
router.get(
  '/export-consolidated/:playgroundId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { playgroundId } = req.params;
    const { format = 'json' } = req.query;

    // Verify admin role
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can export datasets' });
    }

    console.log('=== EXPORT CONSOLIDATED DATASET ===');
    console.log('Playground ID:', playgroundId);
    console.log('Format:', format);
    console.log('Admin:', req.user!.email);

    // Get consolidated parent tasks with their answers
    const { data: consolidatedTasks, error: tasksError } = await supabase
      .from('parent_tasks')
      .select(`
        id,
        file_name,
        file_type,
        file_url,
        consolidated_at,
        consolidated_by,
        admin_notes
      `)
      .eq('playground_id', playgroundId)
      .eq('status', 'consolidated')
      .order('consolidated_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching consolidated tasks:', tasksError);
      return res.status(500).json({ error: 'Failed to fetch consolidated tasks' });
    }

    if (!consolidatedTasks || consolidatedTasks.length === 0) {
      return res.status(404).json({ error: 'No consolidated tasks found' });
    }

    // Get consolidated answers for these tasks
    const taskIds = consolidatedTasks.map(t => t.id);
    const { data: consolidatedAnswers, error: answersError } = await supabase
      .from('consolidated_answers')
      .select(`
        parent_task_id,
        question_id,
        answer_value,
        answer_text,
        consolidated_at,
        questions:question_id (
          question_text,
          question_type
        )
      `)
      .in('parent_task_id', taskIds);

    if (answersError) {
      console.error('Error fetching consolidated answers:', answersError);
      return res.status(500).json({ error: 'Failed to fetch consolidated answers' });
    }

    // Build dataset structure
    const dataset = consolidatedTasks.map(task => {
      const taskAnswers = (consolidatedAnswers || []).filter(
        a => a.parent_task_id === task.id
      );

      const answersObj: Record<string, any> = {};
      taskAnswers.forEach(answer => {
        const question = (answer.questions as any);
        const questionText = question?.question_text || `Question ${answer.question_id}`;
        answersObj[questionText] = answer.answer_value || answer.answer_text;
      });

      return {
        file_name: task.file_name,
        file_type: task.file_type,
        file_url: task.file_url,
        consolidated_at: task.consolidated_at,
        admin_notes: task.admin_notes,
        answers: answersObj
      };
    });

    console.log(`Exporting ${dataset.length} consolidated tasks in ${format} format`);

    // Handle different export formats
    if (format === 'json') {
      return res.json({
        playground_id: playgroundId,
        exported_at: new Date().toISOString(),
        total_items: dataset.length,
        data: dataset
      });
    }

    if (format === 'csv' || format === 'xlsx') {
      const XLSX = await import('xlsx');
      
      // Flatten data for spreadsheet
      const flatData = dataset.map(item => {
        const flat: Record<string, any> = {
          'Nome do Arquivo': item.file_name,
          'Tipo': item.file_type,
          'URL': item.file_url,
          'Consolidado em': item.consolidated_at,
          'Notas do Admin': item.admin_notes || ''
        };

        // Add each answer as a column
        Object.entries(item.answers).forEach(([question, answer]) => {
          flat[question] = answer;
        });

        return flat;
      });

      const worksheet = XLSX.utils.json_to_sheet(flatData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dataset Consolidado');

      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="dataset-consolidado-${playgroundId}.csv"`);
        return res.send(csv);
      } else {
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="dataset-consolidado-${playgroundId}.xlsx"`);
        return res.send(buffer);
      }
    }

    return res.status(400).json({ error: 'Invalid format. Use json, csv, or xlsx' });
  })
);

export default router;
