import React, { PureComponent } from 'react'
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'

function noop() {}

type SwipeableActionHandler = (
  e: GestureResponderEvent,
  gestureState: PanResponderGestureState,
  swipeable: Swipeable
) => void

type SwipeableTriggerType =
  | 'onLeftActionActivate'
  | 'onLeftActionDeactivate'
  | 'onLeftActionRelease'
  | 'onLeftActionComplete'
  | 'onRightActionActivate'
  | 'onRightActionDeactivate'
  | 'onRightActionRelease'
  | 'onRightActionComplete'
  | 'onLeftButtonsActivate'
  | 'onLeftButtonsDeactivate'
  | 'onLeftButtonsOpenRelease'
  | 'onLeftButtonsOpenComplete'
  | 'onLeftButtonsCloseRelease'
  | 'onLeftButtonsCloseComplete'
  | 'onRightButtonsActivate'
  | 'onRightButtonsDeactivate'
  | 'onRightButtonsOpenRelease'
  | 'onRightButtonsOpenComplete'
  | 'onRightButtonsCloseRelease'
  | 'onRightButtonsCloseComplete'
  | 'onSwipeStart'
  | 'onSwipeMove'
  | 'onSwipeRelease'
  | 'onSwipeComplete'

type SwipeableAnimationFn<TConfig extends Animated.AnimationConfig = Animated.AnimationConfig> = (
  pan: Animated.ValueXY,
  config: TConfig
) => Animated.CompositeAnimation

export type SwipeableProps = {
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftButtons: React.ReactNode[] | null
  rightButtons: React.ReactNode[] | null
} & Partial<Record<SwipeableTriggerType, SwipeableActionHandler>> & {
    leftActionActivationDistance: number
    leftActionReleaseAnimationFn: SwipeableAnimationFn | null
    leftActionReleaseAnimationConfig: Animated.TimingAnimationConfig | null
    leftButtonWidth: number
    leftButtonsActivationDistance: number
    leftButtonsOpenReleaseAnimationFn: SwipeableAnimationFn | null
    leftButtonsOpenReleaseAnimationConfig: Animated.AnimationConfig | null
    leftButtonsCloseReleaseAnimationFn: SwipeableAnimationFn | null
    leftButtonsCloseReleaseAnimationConfig: Animated.TimingAnimationConfig | null

    rightActionActivationDistance: number
    rightActionReleaseAnimationFn: SwipeableAnimationFn | null
    rightActionReleaseAnimationConfig: Animated.TimingAnimationConfig | null
    rightButtonWidth: number
    rightButtonsActivationDistance: number
    rightButtonsOpenReleaseAnimationFn: SwipeableAnimationFn | null
    rightButtonsOpenReleaseAnimationConfig: Animated.AnimationConfig | null
    rightButtonsCloseReleaseAnimationFn: SwipeableAnimationFn | null
    rightButtonsCloseReleaseAnimationConfig: Animated.TimingAnimationConfig | null

    swipeReleaseAnimationFn: SwipeableAnimationFn<Animated.TimingAnimationConfig>
    swipeReleaseAnimationConfig: Animated.TimingAnimationConfig

    onRef: (swipeable: Swipeable) => void
    onPanAnimatedValueRef: (pan: Animated.AnimatedValueXY) => void
    swipeStartMinDistance: number

    style?: StyleProp<ViewStyle>
    leftContainerStyle?: StyleProp<ViewStyle>
    leftButtonContainerStyle?: StyleProp<ViewStyle>
    rightContainerStyle?: StyleProp<ViewStyle>
    rightButtonContainerStyle?: StyleProp<ViewStyle>
    contentContainerStyle?: StyleProp<ViewStyle>
  }

type SwipeableState = {
  width: number
  lastOffset: { x: number; y: number }
  leftActionActivated: boolean
  leftButtonsActivated: boolean
  leftButtonsOpen: boolean
  rightActionActivated: boolean
  rightButtonsActivated: boolean
  rightButtonsOpen: boolean
}

export default class Swipeable extends PureComponent<SwipeableProps, SwipeableState> {
  private pan = new Animated.ValueXY()
  private unmounted = false
  private handlePan = Animated.event([
    null,
    {
      dx: this.pan.x,
      dy: this.pan.y,
    },
  ])

  static defaultProps: SwipeableProps = {
    leftContent: null,
    rightContent: null,
    leftButtons: null,
    rightButtons: null,

    // left action lifecycle
    onLeftActionActivate: noop,
    onLeftActionDeactivate: noop,
    onLeftActionRelease: noop,
    onLeftActionComplete: noop,
    leftActionActivationDistance: 125,
    leftActionReleaseAnimationFn: null,
    leftActionReleaseAnimationConfig: null,

    // right action lifecycle
    onRightActionActivate: noop,
    onRightActionDeactivate: noop,
    onRightActionRelease: noop,
    onRightActionComplete: noop,
    rightActionActivationDistance: 125,
    rightActionReleaseAnimationFn: null,
    rightActionReleaseAnimationConfig: null,

    // left buttons lifecycle
    onLeftButtonsActivate: noop,
    onLeftButtonsDeactivate: noop,
    onLeftButtonsOpenRelease: noop,
    onLeftButtonsOpenComplete: noop,
    onLeftButtonsCloseRelease: noop,
    onLeftButtonsCloseComplete: noop,
    leftButtonWidth: 75,
    leftButtonsActivationDistance: 75,
    leftButtonsOpenReleaseAnimationFn: null,
    leftButtonsOpenReleaseAnimationConfig: null,
    leftButtonsCloseReleaseAnimationFn: null,
    leftButtonsCloseReleaseAnimationConfig: null,

    // right buttons lifecycle
    onRightButtonsActivate: noop,
    onRightButtonsDeactivate: noop,
    onRightButtonsOpenRelease: noop,
    onRightButtonsOpenComplete: noop,
    onRightButtonsCloseRelease: noop,
    onRightButtonsCloseComplete: noop,
    rightButtonWidth: 75,
    rightButtonsActivationDistance: 75,
    rightButtonsOpenReleaseAnimationFn: null,
    rightButtonsOpenReleaseAnimationConfig: null,
    rightButtonsCloseReleaseAnimationFn: null,
    rightButtonsCloseReleaseAnimationConfig: null,

    // base swipe lifecycle
    onSwipeStart: noop,
    onSwipeMove: noop,
    onSwipeRelease: noop,
    onSwipeComplete: noop,
    swipeReleaseAnimationFn: Animated.timing,
    swipeReleaseAnimationConfig: {
      toValue: { x: 0, y: 0 },
      duration: 250,
      easing: Easing.elastic(0.5),
      useNativeDriver: false,
    },

    // misc
    onRef: noop,
    onPanAnimatedValueRef: noop,
    swipeStartMinDistance: 15,
  }

  constructor(props: SwipeableProps) {
    super(props)
    this.state = {
      width: 0,
      lastOffset: { x: 0, y: 0 },
      leftActionActivated: false,
      leftButtonsActivated: false,
      leftButtonsOpen: false,
      rightActionActivated: false,
      rightButtonsActivated: false,
      rightButtonsOpen: false,
    }
  }

  UNSAFE_componentWillMount() {
    const { onPanAnimatedValueRef, onRef } = this.props

    onRef(this)
    onPanAnimatedValueRef(this.pan)
  }

  componentWillUnmount() {
    this.unmounted = true
  }

  recenter = (
    animationFn: SwipeableAnimationFn<Animated.TimingAnimationConfig> = this.props.swipeReleaseAnimationFn,
    animationConfig: Animated.TimingAnimationConfig = this.props.swipeReleaseAnimationConfig,
    onDone: Parameters<Animated.CompositeAnimation['start']>[0] = undefined
  ) => {
    const { pan } = this

    this.setState({
      lastOffset: { x: 0, y: 0 },
      leftActionActivated: false,
      leftButtonsActivated: false,
      leftButtonsOpen: false,
      rightActionActivated: false,
      rightButtonsActivated: false,
      rightButtonsOpen: false,
    })

    pan.flattenOffset()

    animationFn(pan, animationConfig).start(onDone)
  }

  private handleMoveShouldSetPanResponder = (event: GestureResponderEvent, gestureState: PanResponderGestureState) =>
    Math.abs(gestureState.dx) > this.props.swipeStartMinDistance

  private handlePanResponderStart = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const { lastOffset } = this.state
    const { pan } = this

    pan.setOffset(lastOffset)
    this.props.onSwipeStart?.(event, gestureState, this)
  }

  private handlePanResponderMove = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const {
      leftActionActivationDistance,
      leftButtonsActivationDistance,
      onLeftActionActivate,
      onLeftActionDeactivate,
      onLeftButtonsActivate,
      onLeftButtonsDeactivate,
      rightActionActivationDistance,
      rightButtonsActivationDistance,
      onRightActionActivate,
      onRightActionDeactivate,
      onRightButtonsActivate,
      onRightButtonsDeactivate,
      onSwipeMove,
    } = this.props
    const {
      lastOffset,
      leftActionActivated,
      leftButtonsActivated,
      rightActionActivated,
      rightButtonsActivated,
    } = this.state
    const { dx, vx } = gestureState
    const x = dx + lastOffset.x
    const canSwipeRight = this.canSwipeRight()
    const canSwipeLeft = this.canSwipeLeft()
    const hasLeftButtons = this.hasLeftButtons()
    const hasRightButtons = this.hasRightButtons()
    const isSwipingLeft = vx < 0
    const isSwipingRight = vx > 0
    let nextLeftActionActivated = leftActionActivated
    let nextLeftButtonsActivated = leftButtonsActivated
    let nextRightActionActivated = rightActionActivated
    let nextRightButtonsActivated = rightButtonsActivated

    this.handlePan(event, gestureState)
    onSwipeMove?.(event, gestureState, this)

    if (!leftActionActivated && canSwipeRight && x >= leftActionActivationDistance) {
      nextLeftActionActivated = true
      onLeftActionActivate?.(event, gestureState, this)
    }

    if (leftActionActivated && canSwipeRight && x < leftActionActivationDistance) {
      nextLeftActionActivated = false
      onLeftActionDeactivate?.(event, gestureState, this)
    }

    if (!rightActionActivated && canSwipeLeft && x <= -rightActionActivationDistance) {
      nextRightActionActivated = true
      onRightActionActivate?.(event, gestureState, this)
    }

    if (rightActionActivated && canSwipeLeft && x > -rightActionActivationDistance) {
      nextRightActionActivated = false
      onRightActionDeactivate?.(event, gestureState, this)
    }

    if (!leftButtonsActivated && hasLeftButtons && !isSwipingLeft && x >= leftButtonsActivationDistance) {
      nextLeftButtonsActivated = true
      onLeftButtonsActivate?.(event, gestureState, this)
    }

    if (leftButtonsActivated && hasLeftButtons && isSwipingLeft) {
      nextLeftButtonsActivated = false
      onLeftButtonsDeactivate?.(event, gestureState, this)
    }

    if (!rightButtonsActivated && hasRightButtons && !isSwipingRight && x <= -rightButtonsActivationDistance) {
      nextRightButtonsActivated = true
      onRightButtonsActivate?.(event, gestureState, this)
    }

    if (rightButtonsActivated && hasRightButtons && isSwipingRight) {
      nextRightButtonsActivated = false
      onRightButtonsDeactivate?.(event, gestureState, this)
    }

    const needsUpdate =
      nextLeftActionActivated !== leftActionActivated ||
      nextLeftButtonsActivated !== leftButtonsActivated ||
      nextRightActionActivated !== rightActionActivated ||
      nextRightButtonsActivated !== rightButtonsActivated

    if (needsUpdate) {
      this.setState({
        leftActionActivated: nextLeftActionActivated,
        leftButtonsActivated: nextLeftButtonsActivated,
        rightActionActivated: nextRightActionActivated,
        rightButtonsActivated: nextRightButtonsActivated,
      })
    }
  }

  private handlePanResponderEnd = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const {
      onLeftActionRelease,
      onLeftActionDeactivate,
      onLeftButtonsOpenRelease,
      onLeftButtonsCloseRelease,
      onRightActionRelease,
      onRightActionDeactivate,
      onRightButtonsOpenRelease,
      onRightButtonsCloseRelease,
      onSwipeRelease,
    } = this.props
    const {
      leftActionActivated,
      leftButtonsOpen,
      leftButtonsActivated,
      rightActionActivated,
      rightButtonsOpen,
      rightButtonsActivated,
    } = this.state
    const { pan } = this
    const animationFn = this.getReleaseAnimationFn()
    const animationConfig = this.getReleaseAnimationConfig()

    onSwipeRelease?.(event, gestureState, this)

    if (leftActionActivated) {
      onLeftActionRelease?.(event, gestureState, this)
    }

    if (rightActionActivated) {
      onRightActionRelease?.(event, gestureState, this)
    }

    if (leftButtonsActivated && !leftButtonsOpen) {
      onLeftButtonsOpenRelease?.(event, gestureState, this)
    }

    if (!leftButtonsActivated && leftButtonsOpen) {
      onLeftButtonsCloseRelease?.(event, gestureState, this)
    }

    if (rightButtonsActivated && !rightButtonsOpen) {
      onRightButtonsOpenRelease?.(event, gestureState, this)
    }

    if (!rightButtonsActivated && rightButtonsOpen) {
      onRightButtonsCloseRelease?.(event, gestureState, this)
    }

    let x: number = 0
    let y: number = 0
    if (
      typeof animationConfig.toValue === 'object' &&
      animationConfig.toValue.hasOwnProperty('x') &&
      animationConfig.toValue.hasOwnProperty('y')
    ) {
      const toValue = animationConfig.toValue as { x: number; y: number }
      if (typeof toValue.x === 'number') {
        x = toValue.x
      }
      if (typeof toValue.y === 'number') {
        y = toValue.y
      }
    }
    this.setState({
      lastOffset: { x, y },
      leftActionActivated: false,
      rightActionActivated: false,
      leftButtonsOpen: leftButtonsActivated,
      rightButtonsOpen: rightButtonsActivated,
    })

    pan.flattenOffset()

    animationFn(pan, animationConfig).start(() => {
      if (this.unmounted) {
        return
      }

      const {
        onLeftActionComplete,
        onLeftButtonsOpenComplete,
        onLeftButtonsCloseComplete,
        onRightActionComplete,
        onRightButtonsOpenComplete,
        onRightButtonsCloseComplete,
        onSwipeComplete,
      } = this.props

      onSwipeComplete?.(event, gestureState, this)

      if (leftActionActivated) {
        onLeftActionComplete?.(event, gestureState, this)
        onLeftActionDeactivate?.(event, gestureState, this)
      }

      if (rightActionActivated) {
        onRightActionComplete?.(event, gestureState, this)
        onRightActionDeactivate?.(event, gestureState, this)
      }

      if (leftButtonsActivated && !leftButtonsOpen) {
        onLeftButtonsOpenComplete?.(event, gestureState, this)
      }

      if (!leftButtonsActivated && leftButtonsOpen) {
        onLeftButtonsCloseComplete?.(event, gestureState, this)
      }

      if (rightButtonsActivated && !rightButtonsOpen) {
        onRightButtonsOpenComplete?.(event, gestureState, this)
      }

      if (!rightButtonsActivated && rightButtonsOpen) {
        onRightButtonsCloseComplete?.(event, gestureState, this)
      }
    })
  }

  private panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: this.handleMoveShouldSetPanResponder,
    onMoveShouldSetPanResponderCapture: this.handleMoveShouldSetPanResponder,
    onPanResponderGrant: this.handlePanResponderStart,
    onPanResponderMove: this.handlePanResponderMove,
    onPanResponderRelease: this.handlePanResponderEnd,
    onPanResponderTerminate: this.handlePanResponderEnd,
    onPanResponderTerminationRequest: (event, gestureState) => {
      this.handlePanResponderEnd(event, gestureState)
      return false
    },
  })

  private handleLayout = ({
    nativeEvent: {
      layout: { width },
    },
  }: LayoutChangeEvent) => this.setState({ width })

  private canSwipeRight = () => {
    return this.props.leftContent || this.hasLeftButtons()
  }

  private canSwipeLeft = () => {
    return this.props.rightContent || this.hasRightButtons()
  }

  private hasLeftButtons = () => {
    const { leftButtons, leftContent } = this.props

    return !leftContent && leftButtons && leftButtons.length
  }

  private hasRightButtons = () => {
    const { rightButtons, rightContent } = this.props

    return !rightContent && rightButtons && rightButtons.length
  }

  private getReleaseAnimationFn = () => {
    const {
      leftActionReleaseAnimationFn,
      leftButtonsOpenReleaseAnimationFn,
      leftButtonsCloseReleaseAnimationFn,
      rightActionReleaseAnimationFn,
      rightButtonsOpenReleaseAnimationFn,
      rightButtonsCloseReleaseAnimationFn,
      swipeReleaseAnimationFn,
    } = this.props
    const {
      leftActionActivated,
      leftButtonsActivated,
      leftButtonsOpen,
      rightActionActivated,
      rightButtonsActivated,
      rightButtonsOpen,
    } = this.state

    if (leftActionActivated && leftActionReleaseAnimationFn) {
      return leftActionReleaseAnimationFn
    }

    if (rightActionActivated && rightActionReleaseAnimationFn) {
      return rightActionReleaseAnimationFn
    }

    if (leftButtonsActivated && leftButtonsOpenReleaseAnimationFn) {
      return leftButtonsOpenReleaseAnimationFn
    }

    if (!leftButtonsActivated && leftButtonsOpen && leftButtonsCloseReleaseAnimationFn) {
      return leftButtonsCloseReleaseAnimationFn
    }

    if (rightButtonsActivated && rightButtonsOpenReleaseAnimationFn) {
      return rightButtonsOpenReleaseAnimationFn
    }

    if (!rightButtonsActivated && rightButtonsOpen && rightButtonsCloseReleaseAnimationFn) {
      return rightButtonsCloseReleaseAnimationFn
    }

    return swipeReleaseAnimationFn
  }

  private getReleaseAnimationConfig = (): Animated.TimingAnimationConfig => {
    const {
      leftActionReleaseAnimationConfig,
      leftButtons,
      leftButtonsOpenReleaseAnimationConfig,
      leftButtonsCloseReleaseAnimationConfig,
      leftButtonWidth,
      rightActionReleaseAnimationConfig,
      rightButtons,
      rightButtonsOpenReleaseAnimationConfig,
      rightButtonsCloseReleaseAnimationConfig,
      rightButtonWidth,
      swipeReleaseAnimationConfig,
    } = this.props
    const {
      leftActionActivated,
      leftButtonsActivated,
      leftButtonsOpen,
      rightActionActivated,
      rightButtonsActivated,
      rightButtonsOpen,
    } = this.state

    if (leftActionActivated && leftActionReleaseAnimationConfig) {
      return leftActionReleaseAnimationConfig
    }

    if (rightActionActivated && rightActionReleaseAnimationConfig) {
      return rightActionReleaseAnimationConfig
    }

    if (leftButtonsActivated) {
      return {
        ...swipeReleaseAnimationConfig,
        toValue: {
          x: (leftButtons || []).length * leftButtonWidth,
          y: 0,
        },
        ...leftButtonsOpenReleaseAnimationConfig,
      }
    }

    if (rightButtonsActivated) {
      return {
        ...swipeReleaseAnimationConfig,
        toValue: {
          x: (rightButtons || []).length * rightButtonWidth * -1,
          y: 0,
        },
        ...rightButtonsOpenReleaseAnimationConfig,
      }
    }

    if (!leftButtonsActivated && leftButtonsOpen && leftButtonsCloseReleaseAnimationConfig) {
      return leftButtonsCloseReleaseAnimationConfig
    }

    if (!rightButtonsActivated && rightButtonsOpen && rightButtonsCloseReleaseAnimationConfig) {
      return rightButtonsCloseReleaseAnimationConfig
    }

    return swipeReleaseAnimationConfig
  }

  private renderButtons: React.FC<{ buttons: React.ReactNode[] | null; isLeftButtons: boolean }> = (props) => {
    const buttons = props.buttons || []
    const { isLeftButtons } = props
    const { leftButtonContainerStyle, rightButtonContainerStyle } = this.props
    const { width } = this.state
    const { pan } = this
    const canSwipeLeft = this.canSwipeLeft()
    const canSwipeRight = this.canSwipeRight()
    const count = buttons.length
    const leftEnd = canSwipeLeft ? -width : 0
    const rightEnd = canSwipeRight ? width : 0
    const inputRange = isLeftButtons ? [0, rightEnd] : [leftEnd, 0]

    return (
      <>
        {buttons.map((buttonContent, index) => {
          const outputMultiplier = -index / count
          const outputRange = isLeftButtons ? [0, rightEnd * outputMultiplier] : [leftEnd * outputMultiplier, 0]
          const transform = [
            {
              translateX: pan.x.interpolate({
                inputRange,
                outputRange,
                extrapolate: 'clamp',
              }),
            },
          ]
          const buttonStyle = [
            StyleSheet.absoluteFill,
            { width, transform },
            isLeftButtons ? leftButtonContainerStyle : rightButtonContainerStyle,
          ]

          return (
            <Animated.View key={index} style={buttonStyle}>
              {buttonContent}
            </Animated.View>
          )
        })}
      </>
    )
  }

  render() {
    const {
      children,
      contentContainerStyle,
      leftButtons,
      leftContainerStyle,
      leftContent,
      rightButtons,
      rightContainerStyle,
      rightContent,
      style,
      ...props
    } = this.props
    const { width } = this.state
    const { pan } = this
    const canSwipeLeft = this.canSwipeLeft()
    const canSwipeRight = this.canSwipeRight()
    const transform = [
      {
        translateX: pan.x.interpolate({
          inputRange: [canSwipeLeft ? -width : 0, canSwipeRight ? width : 0],
          outputRange: [
            canSwipeLeft ? -width + StyleSheet.hairlineWidth : 0,
            canSwipeRight ? width - StyleSheet.hairlineWidth : 0,
          ],
          extrapolate: 'clamp',
        }),
      },
    ]

    const { renderButtons: Buttons } = this

    return (
      <View
        onLayout={this.handleLayout}
        style={[styles.container, style]}
        {...this.panResponder.panHandlers}
        {...props}
      >
        {canSwipeRight && (
          <Animated.View style={[{ transform, marginLeft: -width, width }, leftContainerStyle]}>
            {leftContent || <Buttons buttons={leftButtons} isLeftButtons={true} />}
          </Animated.View>
        )}
        <Animated.View style={[{ transform }, styles.content, contentContainerStyle]}>{children}</Animated.View>
        {canSwipeLeft && (
          <Animated.View style={[{ transform, marginRight: -width, width }, rightContainerStyle]}>
            {rightContent || <Buttons buttons={rightButtons} isLeftButtons={false} />}
          </Animated.View>
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
})
