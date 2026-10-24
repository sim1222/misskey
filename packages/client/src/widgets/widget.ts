import { reactive, watch, type UnwrapNestedRefs } from 'vue';
import { throttle } from 'throttle-debounce';
import { Form, GetFormResultType } from '@/scripts/form';
import { widgetPropsWithDefaults } from './props';
import * as os from '@/os';

export type Widget<P extends Record<string, unknown>> = {
	id: string;
	data: Partial<P>;
};

export type WidgetComponentProps<P extends Record<string, unknown>> = {
	widget?: Widget<P>;
};

export type WidgetComponentEmits<P extends Record<string, unknown>> = {
	(ev: 'updateProps', props: P): void;
};

export type WidgetComponentExpose = {
	name: string;
	id: string | null;
	configure: () => void;
};

export const useWidgetPropsManager = <F extends Form>(
	name: string,
	propsDef: F,
	props: Readonly<WidgetComponentProps<GetFormResultType<F>>>,
	emit: WidgetComponentEmits<GetFormResultType<F>>,
): {
	widgetProps: UnwrapNestedRefs<GetFormResultType<F>>;
	save: () => void;
	configure: () => void;
} => {
	const widgetProps = reactive(widgetPropsWithDefaults(propsDef, props.widget ? JSON.parse(JSON.stringify(props.widget.data)) : {}));
 watch(widgetProps, () => { Object.assign(widgetProps, widgetPropsWithDefaults(propsDef, widgetProps)); }, { deep: true, immediate: true });

	const save = throttle(3000, () => {
		emit('updateProps', widgetPropsWithDefaults(propsDef, widgetProps));
	});

	const configure = async () => {
		const form: Form = JSON.parse(JSON.stringify(propsDef));
 const defaults = new Map(Object.entries(widgetProps));
		for (const item of Object.keys(form)) {
			form[item].default = defaults.get(item);
		}
		const { canceled, result } = await os.form(name, form);
		if (canceled) return;

		Object.assign(widgetProps, result);

		save();
	};

	return {
		widgetProps,
		save,
		configure,
	};
};
