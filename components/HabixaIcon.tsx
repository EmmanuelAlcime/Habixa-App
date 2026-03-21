import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { type ComponentProps } from 'react';

type HabixaIconProps = Omit<ComponentProps<typeof FontAwesome5>, 'name'> & {
  name: React.ComponentProps<typeof FontAwesome5>['name'];
};

export function HabixaIcon({ name, size = 16, color = '#5C7C6F', ...props }: HabixaIconProps) {
  return <FontAwesome5 name={name} size={size} color={color} {...props} />;
}
