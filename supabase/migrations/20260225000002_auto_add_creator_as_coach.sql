-- Trigger to automatically add team creator as head coach when team is created
CREATE OR REPLACE FUNCTION auto_add_creator_as_coach()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_coaches (team_id, coach_id, role)
  VALUES (NEW.id, NEW.created_by, 'head_coach')
  ON CONFLICT (team_id, coach_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_add_creator_as_coach ON teams;

-- Create trigger
CREATE TRIGGER trigger_auto_add_creator_as_coach
AFTER INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION auto_add_creator_as_coach();
