import React from 'react'

interface RobotListProps {
  onSelect: (robotId: string) => void
  selectedRobot: string | null
}

const RobotList: React.FC<RobotListProps> = ({ onSelect, selectedRobot }) => {
  const robots = ['ELEGOO', 'DummyWebcam']

  return (
    <ul className="robot-list">
      {robots.map((robot) => (
        <li
          key={robot}
          className={`robot-item ${selectedRobot === robot ? 'selected' : ''}`}
          onClick={() => onSelect(robot)}
        >
          {robot}
        </li>
      ))}
    </ul>
  )
}

export default RobotList
