-- Create Introductory Courses System
-- This migration creates tables for courses with steps, evaluations, and tracking

-- Table: courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: course_steps
CREATE TABLE course_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  audio_url TEXT,
  has_evaluation BOOLEAN DEFAULT FALSE,
  evaluation_required BOOLEAN DEFAULT FALSE,
  min_score INT, -- Minimum score required to pass (if evaluation_required = true)
  max_attempts INT, -- Maximum attempts allowed (null = unlimited)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

-- Table: evaluation_questions
CREATE TABLE evaluation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES course_steps(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  question_video_url TEXT,
  question_audio_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(step_id, order_index)
);

-- Table: question_options
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES evaluation_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question_id, order_index)
);

-- Table: user_course_progress
CREATE TABLE user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES course_steps(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(user_id, course_id)
);

-- Table: user_step_attempts
CREATE TABLE user_step_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES course_steps(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  score INT NOT NULL, -- Number of correct answers
  total_questions INT NOT NULL,
  passed BOOLEAN DEFAULT FALSE,
  answers JSONB, -- Store user answers: [{ question_id, selected_option_id, is_correct }]
  attempted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, step_id, attempt_number)
);

-- Indexes for better performance
CREATE INDEX idx_courses_created_by ON courses(created_by);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_course_steps_course_id ON course_steps(course_id);
CREATE INDEX idx_evaluation_questions_step_id ON evaluation_questions(step_id);
CREATE INDEX idx_question_options_question_id ON question_options(question_id);
CREATE INDEX idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX idx_user_course_progress_course_id ON user_course_progress(course_id);
CREATE INDEX idx_user_step_attempts_user_id ON user_step_attempts(user_id);
CREATE INDEX idx_user_step_attempts_step_id ON user_step_attempts(step_id);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_step_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Admins can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- RLS Policies for course_steps
CREATE POLICY "Anyone can view steps of published courses"
  ON course_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM courses WHERE courses.id = course_steps.course_id AND courses.is_published = TRUE
  ));

CREATE POLICY "Admins can view all steps"
  ON course_steps FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage steps"
  ON course_steps FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- RLS Policies for evaluation_questions
CREATE POLICY "Anyone can view questions of published courses"
  ON evaluation_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_steps cs
    JOIN courses c ON c.id = cs.course_id
    WHERE cs.id = evaluation_questions.step_id AND c.is_published = TRUE
  ));

CREATE POLICY "Admins can manage questions"
  ON evaluation_questions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- RLS Policies for question_options
CREATE POLICY "Anyone can view options of published courses"
  ON question_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM evaluation_questions eq
    JOIN course_steps cs ON cs.id = eq.step_id
    JOIN courses c ON c.id = cs.course_id
    WHERE eq.id = question_options.question_id AND c.is_published = TRUE
  ));

CREATE POLICY "Admins can manage options"
  ON question_options FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- RLS Policies for user_course_progress
CREATE POLICY "Users can view their own progress"
  ON user_course_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own progress"
  ON user_course_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON user_course_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON user_course_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- RLS Policies for user_step_attempts
CREATE POLICY "Users can view their own attempts"
  ON user_step_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts"
  ON user_step_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts"
  ON user_step_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Comments
COMMENT ON TABLE courses IS 'Introductory courses created by admins';
COMMENT ON TABLE course_steps IS 'Steps within a course with content and optional evaluations';
COMMENT ON TABLE evaluation_questions IS 'Multiple choice questions for step evaluations';
COMMENT ON TABLE question_options IS 'Answer options for evaluation questions';
COMMENT ON TABLE user_course_progress IS 'Tracks user progress through courses';
COMMENT ON TABLE user_step_attempts IS 'Records each attempt at step evaluations';
